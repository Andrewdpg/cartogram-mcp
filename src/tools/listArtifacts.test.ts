import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { listArtifactsTool } from './listArtifacts.js'
import { upsertArtifactTool } from './upsertArtifact.js'

let waycairnDir: string

beforeEach(() => {
  waycairnDir = mkdtempSync(join(tmpdir(), 'waycairn-list-'))
})

afterEach(() => {
  rmSync(waycairnDir, { recursive: true, force: true })
})

describe('listArtifactsTool', () => {
  it('returns an empty array when nothing of that kind exists', () => {
    expect(listArtifactsTool(waycairnDir, 'diagram')).toEqual([])
  })

  it('lists every artifact of the given kind, ordered by id', () => {
    upsertArtifactTool(waycairnDir, 'diagram', 'b', { nodes: [], edges: [] })
    upsertArtifactTool(waycairnDir, 'diagram', 'a', { nodes: [], edges: [] })
    const records = listArtifactsTool(waycairnDir, 'diagram')
    expect(records.map((r) => r.id)).toEqual(['a', 'b'])
  })
})
