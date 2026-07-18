// src/tools/getArtifact.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { getArtifactTool } from './getArtifact.js'
import { upsertArtifactTool } from './upsertArtifact.js'
import { writeArtifactFile } from '../artifacts/store.js'

let waycairnDir: string

beforeEach(() => {
  waycairnDir = mkdtempSync(join(tmpdir(), 'waycairn-get-'))
})

afterEach(() => {
  rmSync(waycairnDir, { recursive: true, force: true })
})

describe('getArtifactTool', () => {
  it('returns null when the artifact does not exist', () => {
    expect(getArtifactTool(waycairnDir, 'diagram', 'missing')).toBeNull()
  })

  it('returns an artifact written via upsertArtifactTool', () => {
    upsertArtifactTool(waycairnDir, 'diagram', 'a', { nodes: [], edges: [] })
    const record = getArtifactTool(waycairnDir, 'diagram', 'a')
    expect(record).toMatchObject({ id: 'a', kind: 'diagram', data: { nodes: [], edges: [] } })
  })

  it('picks up a file written outside upsertArtifactTool (e.g. a git checkout), via the lazy reindex', () => {
    writeArtifactFile(waycairnDir, { id: 'b', kind: 'diagram', updatedAt: 't1', data: { nodes: [], edges: [] } })
    const record = getArtifactTool(waycairnDir, 'diagram', 'b')
    expect(record).toMatchObject({ id: 'b', data: { nodes: [], edges: [] } })
  })
})
