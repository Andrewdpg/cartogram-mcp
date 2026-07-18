#!/usr/bin/env node
// bin/waycairn-mcp.ts
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createLocalMcpServer } from '../src/localServer.js'

const server = createLocalMcpServer(process.cwd())
const transport = new StdioServerTransport()
await server.connect(transport)
