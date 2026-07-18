#!/usr/bin/env node
// bin/waycairn.ts
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createLocalMcpServer } from '../src/localServer.js'
import { runInit } from '../src/commands/init.js'

const subcommand = process.argv[2]

if (subcommand === 'init') {
  runInit(process.cwd())
} else if (subcommand === 'mcp') {
  const server = createLocalMcpServer(process.cwd())
  const transport = new StdioServerTransport()
  await server.connect(transport)
} else {
  console.error(`Unknown or missing subcommand: ${JSON.stringify(subcommand)}. Usage: waycairn <init|mcp>`)
  process.exit(1)
}
