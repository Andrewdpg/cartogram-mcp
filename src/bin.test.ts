// src/bin.test.ts
import { describe, it, expect, afterEach } from 'vitest'
import { join } from 'node:path'
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

let client: Client | undefined

afterEach(async () => {
  if (client) await client.close()
  client = undefined
})

describe('bin/waycairn.ts mcp', () => {
  it(
    'starts as a real subprocess and serves all five tools over stdio, scoped to its spawn cwd',
    async () => {
      const sessionRoot = mkdtempSync(join(tmpdir(), 'waycairn-bin-mcp-'))
      try {
        const binPath = join(process.cwd(), 'bin', 'waycairn.ts')
        const transport = new StdioClientTransport({
          command: 'npx',
          args: ['tsx', binPath, 'mcp'],
          cwd: sessionRoot,
        })
        client = new Client({ name: 'test-client', version: '1.0.0' })
        await client.connect(transport)

        const { tools } = await client.listTools()
        expect(tools.map((t) => t.name).sort()).toEqual([
          'get_artifact',
          'list_artifacts',
          'list_repos',
          'upsert_artifact',
          'validate_artifact',
        ])
      } finally {
        rmSync(sessionRoot, { recursive: true, force: true })
      }
    },
    15_000
  )
})

describe('bin/waycairn.ts init', () => {
  it(
    'runs as a real subprocess, registering the repo in a HOME-scoped registry',
    () => {
      const fakeHome = mkdtempSync(join(tmpdir(), 'waycairn-bin-init-home-'))
      const repoRoot = mkdtempSync(join(tmpdir(), 'waycairn-bin-init-repo-'))
      try {
        execFileSync('git', ['-C', repoRoot, 'init', '-q'])
        execFileSync('git', [
          '-C',
          repoRoot,
          'remote',
          'add',
          'origin',
          'https://example-remote-host.test/org/bin-init-test.git',
        ])
        const binPath = join(process.cwd(), 'bin', 'waycairn.ts')
        execFileSync('npx', ['tsx', binPath, 'init'], {
          cwd: repoRoot,
          env: { ...process.env, HOME: fakeHome }, // never touch the real developer machine's ~/.waycairn
        })
        const registryPath = join(fakeHome, '.waycairn', 'registry.json')
        expect(existsSync(registryPath)).toBe(true)
        const registry = JSON.parse(readFileSync(registryPath, 'utf8'))
        expect(registry['example-remote-host.test/org/bin-init-test']).toEqual({
          path: repoRoot,
          name: 'bin-init-test',
        })
      } finally {
        rmSync(fakeHome, { recursive: true, force: true })
        rmSync(repoRoot, { recursive: true, force: true })
      }
    },
    15_000
  )
})
