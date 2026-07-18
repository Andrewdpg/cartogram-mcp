// src/localServer.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { createLocalMcpServer } from './localServer.js'
import { upsertRegistryEntry } from './registry.js'
import { upsertArtifactTool } from './tools/upsertArtifact.js'

let cwd: string
let registryPath: string
let client: Client

beforeEach(async () => {
  cwd = mkdtempSync(join(tmpdir(), 'waycairn-server-'))
  registryPath = join(mkdtempSync(join(tmpdir(), 'waycairn-server-registry-')), 'registry.json')
  const server = createLocalMcpServer(cwd, registryPath)
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await server.connect(serverTransport)
  client = new Client({ name: 'test-client', version: '1.0.0' })
  await client.connect(clientTransport)
})

afterEach(() => {
  rmSync(cwd, { recursive: true, force: true })
})

function textOf(result: Awaited<ReturnType<Client['callTool']>>): string {
  const content = result.content as Array<{ type: string; text: string }>
  return content[0].text
}

describe('createLocalMcpServer', () => {
  it('exposes all five tools', async () => {
    const { tools } = await client.listTools()
    const names = tools.map((t) => t.name).sort()
    expect(names).toEqual(['get_artifact', 'list_artifacts', 'list_repos', 'upsert_artifact', 'validate_artifact'])
  })

  it('list_repos reports "." under local, and an empty registered when the registry is empty', async () => {
    mkdirSync(join(cwd, '.git'))
    const result = await client.callTool({ name: 'list_repos', arguments: {} })
    expect(JSON.parse(textOf(result))).toEqual({ local: ['.'], registered: {} })
  })

  it('list_repos surfaces entries from the registry file', async () => {
    upsertRegistryEntry(registryPath, 'host/org/other-repo', { path: '/somewhere/other-repo', name: 'other-repo' })
    const result = await client.callTool({ name: 'list_repos', arguments: {} })
    expect(JSON.parse(textOf(result))).toEqual({
      local: [],
      registered: { 'host/org/other-repo': { path: '/somewhere/other-repo', name: 'other-repo' } },
    })
  })

  it('round-trips an artifact through upsert_artifact then get_artifact using the default repoPath (".")', async () => {
    await client.callTool({
      name: 'upsert_artifact',
      arguments: { kind: 'diagram', id: 'a', data: { nodes: [], edges: [] } },
    })
    const result = await client.callTool({ name: 'get_artifact', arguments: { kind: 'diagram', id: 'a' } })
    expect(JSON.parse(textOf(result))).toMatchObject({ id: 'a', kind: 'diagram' })
  })

  it('writes under cwd/<repoPath>/.waycairn when repoPath is explicit, isolated from the default repo', async () => {
    mkdirSync(join(cwd, 'auth-service'), { recursive: true })
    await client.callTool({
      name: 'upsert_artifact',
      arguments: { kind: 'diagram', id: 'a', repoPath: 'auth-service', data: { nodes: [], edges: [] } },
    })

    const defaultRepoResult = await client.callTool({ name: 'get_artifact', arguments: { kind: 'diagram', id: 'a' } })
    expect(textOf(defaultRepoResult)).toBe('not found')

    const scopedResult = await client.callTool({
      name: 'get_artifact',
      arguments: { kind: 'diagram', id: 'a', repoPath: 'auth-service' },
    })
    expect(JSON.parse(textOf(scopedResult))).toMatchObject({ id: 'a', kind: 'diagram' })
  })

  it('get_artifact resolves via repoId, reaching a repo registered on the machine but outside cwd', async () => {
    const externalRepoRoot = mkdtempSync(join(tmpdir(), 'waycairn-external-repo-'))
    try {
      upsertArtifactTool(join(externalRepoRoot, '.waycairn'), 'diagram', 'deployment', { nodes: [], edges: [] })
      upsertRegistryEntry(registryPath, 'host/org/external-repo', { path: externalRepoRoot, name: 'external-repo' })

      const result = await client.callTool({
        name: 'get_artifact',
        arguments: { kind: 'diagram', id: 'deployment', repoId: 'host/org/external-repo' },
      })
      expect(JSON.parse(textOf(result))).toMatchObject({ id: 'deployment', kind: 'diagram' })
    } finally {
      rmSync(externalRepoRoot, { recursive: true, force: true })
    }
  })

  it('list_artifacts resolves via repoId the same way', async () => {
    const externalRepoRoot = mkdtempSync(join(tmpdir(), 'waycairn-external-repo-'))
    try {
      upsertArtifactTool(join(externalRepoRoot, '.waycairn'), 'diagram', 'a', { nodes: [], edges: [] })
      upsertRegistryEntry(registryPath, 'host/org/external-repo', { path: externalRepoRoot, name: 'external-repo' })

      const result = await client.callTool({
        name: 'list_artifacts',
        arguments: { kind: 'diagram', repoId: 'host/org/external-repo' },
      })
      const records = JSON.parse(textOf(result)) as Array<{ id: string }>
      expect(records.map((r) => r.id)).toEqual(['a'])
    } finally {
      rmSync(externalRepoRoot, { recursive: true, force: true })
    }
  })

  it('rejects get_artifact called with both repoPath and repoId', async () => {
    const result = await client.callTool({
      name: 'get_artifact',
      arguments: { kind: 'diagram', id: 'a', repoPath: '.', repoId: 'host/org/whatever' },
    })
    expect(result.isError).toBe(true)
  })

  it('rejects get_artifact called with a repoId not present in the registry', async () => {
    const result = await client.callTool({
      name: 'get_artifact',
      arguments: { kind: 'diagram', id: 'a', repoId: 'host/org/never-registered' },
    })
    expect(result.isError).toBe(true)
  })

  it('list_artifacts reflects what upsert_artifact wrote, scoped by repoPath', async () => {
    await client.callTool({
      name: 'upsert_artifact',
      arguments: { kind: 'diagram', id: 'a', data: { nodes: [], edges: [] } },
    })
    const result = await client.callTool({ name: 'list_artifacts', arguments: { kind: 'diagram' } })
    const records = JSON.parse(textOf(result)) as Array<{ id: string }>
    expect(records.map((r) => r.id)).toEqual(['a'])
  })

  it('validate_artifact reports invalid data without writing it (no repoPath needed)', async () => {
    const result = await client.callTool({
      name: 'validate_artifact',
      arguments: { kind: 'diagram', data: { nodes: [{ id: 'a' }], edges: [] } },
    })
    expect(JSON.parse(textOf(result))).toMatchObject({ valid: false })
  })

  it('rejects an unsafe repoPath (containing "..") with a tool error, not a thrown process crash', async () => {
    const result = await client.callTool({
      name: 'get_artifact',
      arguments: { kind: 'diagram', id: 'a', repoPath: '../escape' },
    })
    expect(result.isError).toBe(true)
  })
})
