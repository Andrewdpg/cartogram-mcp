import type { AgentInstaller, InstallResult } from './types.js'
import { installers } from './registry.js'

export interface AgentInstallReport {
  agent: string
  mcpServer: InstallResult
  skill: InstallResult
  sessionHook: InstallResult
}

function safeRun(fn: () => InstallResult): InstallResult {
  try {
    return fn()
  } catch (err) {
    return { installed: false, detail: `error: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export function runInstallers(repoRoot: string, agentInstallers: AgentInstaller[] = installers): AgentInstallReport[] {
  const reports: AgentInstallReport[] = []
  for (const installer of agentInstallers) {
    if (!installer.detect()) continue
    reports.push({
      agent: installer.name,
      mcpServer: safeRun(() => installer.installMcpServer(repoRoot)),
      skill: safeRun(() => installer.installSkill(repoRoot)),
      sessionHook: safeRun(() => installer.installSessionHook(repoRoot)),
    })
  }
  return reports
}
