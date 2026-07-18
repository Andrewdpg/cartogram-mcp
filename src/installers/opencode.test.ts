import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { detectOpencode, opencodeInstaller } from './opencode.js'
import { readJsonFile, writeJsonFile } from './jsonFile.js'

let repoRoot: string

beforeEach(() => {
  repoRoot = mkdtempSync(join(tmpdir(), 'waycairn-opencode-'))
})

afterEach(() => {
  rmSync(repoRoot, { recursive: true, force: true })
})

describe('detectOpencode', () => {
  it('returns true when <homeDir>/.config/opencode exists', () => {
    const fakeHome = mkdtempSync(join(tmpdir(), 'waycairn-oc-home-'))
    mkdirSync(join(fakeHome, '.config', 'opencode'), { recursive: true })
    try {
      expect(detectOpencode(fakeHome)).toBe(true)
    } finally {
      rmSync(fakeHome, { recursive: true, force: true })
    }
  })

  it('returns false when <homeDir>/.config/opencode does not exist', () => {
    const fakeHome = mkdtempSync(join(tmpdir(), 'waycairn-oc-home-'))
    try {
      expect(detectOpencode(fakeHome)).toBe(false)
    } finally {
      rmSync(fakeHome, { recursive: true, force: true })
    }
  })
})

describe('opencodeInstaller.installMcpServer', () => {
  it('writes opencode.json with a local waycairn mcp entry, command as an array', () => {
    opencodeInstaller.installMcpServer(repoRoot)
    const config = readJsonFile(join(repoRoot, 'opencode.json'))
    expect(config).toEqual({ mcp: { waycairn: { type: 'local', command: ['waycairn', 'mcp'] } } })
  })

  it('preserves an existing, unrelated mcp entry', () => {
    writeJsonFile(join(repoRoot, 'opencode.json'), { mcp: { other: { type: 'local', command: ['other'] } } })
    opencodeInstaller.installMcpServer(repoRoot)
    const config = readJsonFile(join(repoRoot, 'opencode.json')) as { mcp: Record<string, unknown> }
    expect(config.mcp.other).toEqual({ type: 'local', command: ['other'] })
    expect(config.mcp.waycairn).toEqual({ type: 'local', command: ['waycairn', 'mcp'] })
  })
})

describe('opencodeInstaller.installSkill', () => {
  it('is a no-op — opencode has no skill concept', () => {
    const result = opencodeInstaller.installSkill(repoRoot)
    expect(result).toEqual({ installed: false, detail: 'opencode has no skill concept' })
  })
})

describe('opencodeInstaller.installSessionHook', () => {
  it('writes a plugin file listening for session.idle', () => {
    opencodeInstaller.installSessionHook(repoRoot)
    const content = readFileSync(join(repoRoot, '.opencode', 'plugin', 'waycairn-nudge.ts'), 'utf8')
    expect(content).toContain('session.idle')
    expect(content).toContain('waycairn')
  })

  it('is idempotent — a second run overwrites with identical content, not a duplicate file', () => {
    opencodeInstaller.installSessionHook(repoRoot)
    const first = readFileSync(join(repoRoot, '.opencode', 'plugin', 'waycairn-nudge.ts'), 'utf8')
    opencodeInstaller.installSessionHook(repoRoot)
    const second = readFileSync(join(repoRoot, '.opencode', 'plugin', 'waycairn-nudge.ts'), 'utf8')
    expect(second).toBe(first)
  })
})
