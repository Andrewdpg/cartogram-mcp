import { homedir } from 'node:os'
import { join } from 'node:path'
import { getRepoId } from '../repoId.js'
import { upsertRegistryEntry } from '../registry.js'
import { ensureGitignoreEntry } from '../gitignoreUpdate.js'
import { runInstallers } from '../installers/runInstallers.js'

export function runInit(repoRoot: string, registryPath: string = join(homedir(), '.waycairn', 'registry.json')): void {
  const repoId = getRepoId(repoRoot)
  const name = repoId.split('/').pop()!

  ensureGitignoreEntry(repoRoot)
  upsertRegistryEntry(registryPath, repoId, { path: repoRoot, name })
  const reports = runInstallers(repoRoot)

  console.log(`waycairn: registered ${repoId} at ${repoRoot}`)
  if (reports.length === 0) {
    console.log('waycairn: no supported agent detected on this machine yet.')
  } else {
    for (const report of reports) {
      console.log(
        `waycairn: ${report.agent} — mcp: ${report.mcpServer.detail}, skill: ${report.skill.detail}, hook: ${report.sessionHook.detail}`
      )
    }
  }
}
