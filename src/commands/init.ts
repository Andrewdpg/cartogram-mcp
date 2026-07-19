import { homedir } from 'node:os'
import { join } from 'node:path'
import { getRepoId } from '../repoId.js'
import { upsertRegistryEntry } from '../registry.js'
import { ensureGitignoreEntry } from '../gitignoreUpdate.js'
import { runInstallers } from '../installers/runInstallers.js'
import type { AgentInstallReport } from '../installers/runInstallers.js'

function printInstallReports(reports: AgentInstallReport[]): void {
  if (reports.length === 0) {
    console.log('waycairn: no supported agent detected on this machine yet.')
    return
  }
  for (const report of reports) {
    console.log(
      `waycairn: ${report.agent} — mcp: ${report.mcpServer.detail}, skill: ${report.skill.detail}, hook: ${report.sessionHook.detail}`
    )
  }
}

export function runInit(repoRoot: string, registryPath: string = join(homedir(), '.waycairn', 'registry.json')): void {
  const repoId = getRepoId(repoRoot)
  const name = repoId.split('/').pop()!

  ensureGitignoreEntry(repoRoot)
  upsertRegistryEntry(registryPath, repoId, { path: repoRoot, name })
  const reports = runInstallers(repoRoot)

  console.log(`waycairn: registered ${repoId} at ${repoRoot}`)
  printInstallReports(reports)
}

// For a parent folder holding several sibling repos (not itself a
// documentable repo) — installs the same per-agent MCP/skill/hook config
// as runInit, scoped to this folder, without requiring a git remote or
// touching the registry/.gitignore. The MCP server resolves everything
// from its cwd at launch time, so the installed config is identical
// either way; only the registration side effects differ.
export function runInitWorkspace(repoRoot: string): void {
  const reports = runInstallers(repoRoot)

  console.log(
    `waycairn: initialized workspace access at ${repoRoot} (not registered — MCP tools use repoPath to target the repos inside it)`
  )
  printInstallReports(reports)
}
