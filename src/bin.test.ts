// src/bin.test.ts
import { describe, it, expect, afterEach } from 'vitest'
import { join } from 'node:path'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

let client: Client | undefined

afterEach(async () => {
  if (client) await client.close()
  client = undefined
})

describe('bin/waycairn-mcp.ts', () => {
  it(
    'starts as a real subprocess and serves all five tools over stdio, scoped to its spawn cwd',
    async () => {
      const sessionRoot = mkdtempSync(join(tmpdir(), 'waycairn-bin-'))
      try {
        const binPath = join(process.cwd(), 'bin', 'waycairn-mcp.ts')
        const transport = new StdioClientTransport({
          command: 'npx',
          args: ['tsx', binPath],
          cwd: sessionRoot, // simulates the MCP client launching the server with this as the session's working directory
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
