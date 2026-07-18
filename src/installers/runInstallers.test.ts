import { describe, it, expect, vi } from 'vitest'
import { runInstallers } from './runInstallers.js'
import type { AgentInstallReport } from './runInstallers.js'
import type { AgentInstaller } from './types.js'

function fakeInstaller(overrides: Partial<AgentInstaller> = {}): AgentInstaller {
  return {
    name: 'fake-agent',
    detect: vi.fn(() => true),
    installMcpServer: vi.fn(() => ({ installed: true, detail: 'mcp done' })),
    installSkill: vi.fn(() => ({ installed: true, detail: 'skill done' })),
    installSessionHook: vi.fn(() => ({ installed: true, detail: 'hook done' })),
    ...overrides,
  }
}

describe('runInstallers', () => {
  it('returns an empty array when no installers are registered', () => {
    expect(runInstallers('/repo', [])).toEqual([])
  })

  it('skips an installer whose detect() returns false', () => {
    const installer = fakeInstaller({ detect: vi.fn(() => false) })
    expect(runInstallers('/repo', [installer])).toEqual([])
    expect(installer.installMcpServer).not.toHaveBeenCalled()
  })

  it('calls all three install methods for a detected installer, passing repoRoot to each', () => {
    const installer = fakeInstaller()
    const reports = runInstallers('/repo/root', [installer])
    expect(installer.installMcpServer).toHaveBeenCalledWith('/repo/root')
    expect(installer.installSkill).toHaveBeenCalledWith('/repo/root')
    expect(installer.installSessionHook).toHaveBeenCalledWith('/repo/root')
    expect(reports).toEqual([
      {
        agent: 'fake-agent',
        mcpServer: { installed: true, detail: 'mcp done' },
        skill: { installed: true, detail: 'skill done' },
        sessionHook: { installed: true, detail: 'hook done' },
      },
    ])
  })

  it('isolates a throwing installMcpServer without skipping the other methods or later installers', () => {
    const throwing = fakeInstaller({
      name: 'throwing-agent',
      installMcpServer: vi.fn(() => {
        throw new Error('invalid JSON')
      }),
    })
    const healthy = fakeInstaller({ name: 'healthy-agent' })

    let reports: AgentInstallReport[] = []
    expect(() => {
      reports = runInstallers('/repo', [throwing, healthy])
    }).not.toThrow()

    expect(reports[0]).toEqual({
      agent: 'throwing-agent',
      mcpServer: { installed: false, detail: expect.stringContaining('invalid JSON') },
      skill: { installed: true, detail: 'skill done' },
      sessionHook: { installed: true, detail: 'hook done' },
    })
    expect(throwing.installSkill).toHaveBeenCalledWith('/repo')
    expect(throwing.installSessionHook).toHaveBeenCalledWith('/repo')

    expect(reports[1]).toEqual({
      agent: 'healthy-agent',
      mcpServer: { installed: true, detail: 'mcp done' },
      skill: { installed: true, detail: 'skill done' },
      sessionHook: { installed: true, detail: 'hook done' },
    })
  })
})
