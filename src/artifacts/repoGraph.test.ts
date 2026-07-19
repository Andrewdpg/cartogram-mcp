import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { resolveRepoId, buildRepoGraph } from './repoGraph.js'
import { upsertArtifactTool } from '../tools/upsertArtifact.js'
import { upsertRegistryEntry } from '../registry.js'
import { openIndexDb, upsertIndexRow } from './db.js'
import { artifactFilePath, writeArtifactFile } from './store.js'

let root: string
let registryPath: string
let repoA: string
let repoB: string
let repoC: string

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'waycairn-repograph-'))
  registryPath = join(root, 'registry.json')
  repoA = join(root, 'repo-a')
  repoB = join(root, 'repo-b')
  repoC = join(root, 'repo-c')
  upsertRegistryEntry(registryPath, 'host/org/a', { path: repoA, name: 'a' })
  upsertRegistryEntry(registryPath, 'host/org/b', { path: repoB, name: 'b' })
  upsertRegistryEntry(registryPath, 'host/org/c', { path: repoC, name: 'c' })
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('resolveRepoId', () => {
  it('finds the repoId whose registry path matches repoRoot', () => {
    expect(resolveRepoId(registryPath, repoA)).toBe('host/org/a')
  })

  it('returns null for an unregistered path', () => {
    expect(resolveRepoId(registryPath, join(root, 'not-registered'))).toBeNull()
  })
})

describe('buildRepoGraph', () => {
  it('connects two repos via a one-directional externalRef and finds deploymentOwner across the component', () => {
    upsertArtifactTool(join(repoA, '.waycairn'), 'diagram', 'deployment', {
      nodes: [{ id: 'b', label: 'B', kind: 'external', externalRef: { repo: 'host/org/b', artifactId: 'components' } }],
      edges: [],
    })
    upsertArtifactTool(join(repoB, '.waycairn'), 'diagram', 'components', { nodes: [], edges: [] })

    const graph = buildRepoGraph(registryPath)
    expect(graph.componentOf('host/org/b')).toEqual(new Set(['host/org/b', 'host/org/a']))
    expect(graph.deploymentOwner('host/org/b')).toBe('host/org/a')
  })

  it('keeps unconnected repos in separate components with independent deploymentOwners', () => {
    upsertArtifactTool(join(repoA, '.waycairn'), 'diagram', 'deployment', { nodes: [], edges: [] })
    upsertArtifactTool(join(repoC, '.waycairn'), 'diagram', 'deployment', { nodes: [], edges: [] })

    const graph = buildRepoGraph(registryPath)
    expect(graph.deploymentOwner('host/org/a')).toBe('host/org/a')
    expect(graph.deploymentOwner('host/org/c')).toBe('host/org/c')
    expect(graph.componentOf('host/org/a').has('host/org/c')).toBe(false)
  })

  it('returns null deploymentOwner when nobody in the component has one', () => {
    upsertArtifactTool(join(repoA, '.waycairn'), 'diagram', 'components', {
      nodes: [{ id: 'b', label: 'B', kind: 'external', externalRef: { repo: 'host/org/b', artifactId: 'components' } }],
      edges: [],
    })
    const graph = buildRepoGraph(registryPath)
    expect(graph.deploymentOwner('host/org/a')).toBeNull()
  })

  it('skips a registered repo whose path no longer exists, without throwing or creating phantom directories', () => {
    const ghostPath = join(root, 'does-not-exist')
    upsertRegistryEntry(registryPath, 'host/org/ghost', { path: ghostPath, name: 'ghost' })
    upsertArtifactTool(join(repoA, '.waycairn'), 'diagram', 'deployment', { nodes: [], edges: [] })
    expect(() => buildRepoGraph(registryPath)).not.toThrow()
    expect(buildRepoGraph(registryPath).deploymentOwner('host/org/a')).toBe('host/org/a')
    expect(existsSync(join(ghostPath, '.waycairn'))).toBe(false)
  })

  it('folds in-progress write data (extra) not yet on disk', () => {
    upsertArtifactTool(join(repoB, '.waycairn'), 'diagram', 'deployment', { nodes: [], edges: [] })
    const extra = {
      repoId: 'host/org/a',
      id: 'deployment',
      data: { nodes: [{ id: 'b', label: 'B', kind: 'external', externalRef: { repo: 'host/org/b', artifactId: 'deployment' } }], edges: [] },
    }
    const graph = buildRepoGraph(registryPath, extra)
    expect(graph.componentOf('host/org/a')).toEqual(new Set(['host/org/a', 'host/org/b']))
  })

  it('discards all rows from a repo when one row has malformed JSON, instead of partially applying it', () => {
    const waycairnDir = join(repoA, '.waycairn')
    // Valid row, contributes an edge to host/org/b.
    upsertArtifactTool(waycairnDir, 'diagram', 'components', {
      nodes: [{ id: 'b', label: 'B', kind: 'external', externalRef: { repo: 'host/org/b', artifactId: 'components' } }],
      edges: [],
    })
    // Second on-disk diagram, but its indexed dataJson is corrupted directly in
    // the db. Its indexedMtimeMs is set to match the file's actual mtime so
    // reindexKind treats it as already-fresh and does not overwrite it by
    // re-reading (and re-stringifying) the file's valid JSON content.
    writeArtifactFile(waycairnDir, { id: 'broken', kind: 'diagram', updatedAt: new Date().toISOString(), data: { nodes: [], edges: [] } })
    const brokenMtimeMs = statSync(artifactFilePath(waycairnDir, 'diagram', 'broken')).mtimeMs
    const db = openIndexDb(waycairnDir)
    try {
      upsertIndexRow(db, {
        kind: 'diagram',
        id: 'broken',
        dataJson: '{ not valid json',
        updatedAt: new Date().toISOString(),
        indexedMtimeMs: brokenMtimeMs,
      })
    } finally {
      db.close()
    }

    const graph = buildRepoGraph(registryPath)
    expect(graph.componentOf('host/org/a')).toEqual(new Set(['host/org/a']))
  })

  it('replaces the stale on-disk edge for the same (repoId, id) with extra, instead of unioning it', () => {
    upsertArtifactTool(join(repoA, '.waycairn'), 'diagram', 'deployment', {
      nodes: [{ id: 'b', label: 'B', kind: 'external', externalRef: { repo: 'host/org/b', artifactId: 'components' } }],
      edges: [],
    })
    upsertArtifactTool(join(repoB, '.waycairn'), 'diagram', 'components', { nodes: [], edges: [] })

    const extra = {
      repoId: 'host/org/a',
      id: 'deployment',
      data: { nodes: [], edges: [] }, // edit removes the externalRef to host/org/b
    }
    const graph = buildRepoGraph(registryPath, extra)
    expect(graph.componentOf('host/org/a')).toEqual(new Set(['host/org/a']))
  })
})
