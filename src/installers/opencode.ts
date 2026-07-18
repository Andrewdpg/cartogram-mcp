import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'
import type { AgentInstaller, InstallResult } from './types.js'
import { readJsonFile, writeJsonFile } from './jsonFile.js'
import { WAYCAIRN_NUDGE } from './sharedContent.js'

export function detectOpencode(homeDir: string = homedir()): boolean {
  return existsSync(join(homeDir, '.config', 'opencode'))
}

function installMcpServer(repoRoot: string): InstallResult {
  const path = join(repoRoot, 'opencode.json')
  const config = readJsonFile(path) as { mcp?: Record<string, unknown> }
  config.mcp = config.mcp ?? {}
  config.mcp.waycairn = { type: 'local', command: ['waycairn', 'mcp'] }
  writeJsonFile(path, config)
  return { installed: true, detail: `wrote ${path}` }
}

function installSkill(_repoRoot: string): InstallResult {
  return { installed: false, detail: 'opencode has no skill concept' }
}

function installSessionHook(repoRoot: string): InstallResult {
  const path = join(repoRoot, '.opencode', 'plugin', 'waycairn-nudge.ts')
  const content = `export const WaycairnNudge = async () => ({
  event: async ({ event }: { event: { type: string } }) => {
    if (event.type === 'session.idle') {
      console.error('${WAYCAIRN_NUDGE}')
    }
  },
})
`
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content, 'utf8')
  return { installed: true, detail: `wrote ${path}` }
}

export const opencodeInstaller: AgentInstaller = {
  name: 'opencode',
  detect: () => detectOpencode(),
  installMcpServer,
  installSkill,
  installSessionHook,
}
