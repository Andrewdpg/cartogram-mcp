import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { upsertArtifactTool } from './upsertArtifact.js'
import { readArtifactFile } from '../artifacts/store.js'
import { openIndexDb, getIndexRow } from '../artifacts/db.js'
import { UnknownArtifactKindError } from '../artifacts/kinds/registry.js'
import { InvalidDiagramError } from '../validateDiagramShape.js'

let waycairnDir: string

beforeEach(() => {
  waycairnDir = mkdtempSync(join(tmpdir(), 'waycairn-upsert-'))
})

afterEach(() => {
  rmSync(waycairnDir, { recursive: true, force: true })
})

describe('upsertArtifactTool', () => {
  it('writes the artifact file and returns the stored record', () => {
    const data = { nodes: [{ id: 'a', label: 'A', kind: 'service' }], edges: [] }
    const record = upsertArtifactTool(waycairnDir, 'diagram', 'auth-service', data)
    expect(record.id).toBe('auth-service')
    expect(record.kind).toBe('diagram')
    expect(record.data).toEqual(data)
    expect(readArtifactFile(waycairnDir, 'diagram', 'auth-service')).toEqual(record)
  })

  it('updates the sqlite index in the same call', () => {
    const data = { nodes: [], edges: [] }
    upsertArtifactTool(waycairnDir, 'diagram', 'auth-service', data)
    const db = openIndexDb(waycairnDir)
    const row = getIndexRow(db, 'diagram', 'auth-service')
    db.close()
    expect(row).not.toBeNull()
    expect(JSON.parse(row!.dataJson)).toEqual(data)
  })

  it('rejects an unknown kind without writing anything', () => {
    expect(() => upsertArtifactTool(waycairnDir, 'session-note', 'x', {})).toThrow(UnknownArtifactKindError)
    expect(readArtifactFile(waycairnDir, 'session-note', 'x')).toBeNull()
  })

  it('rejects invalid diagram data without writing anything', () => {
    expect(() => upsertArtifactTool(waycairnDir, 'diagram', 'bad', { nodes: [{ id: 'a' }], edges: [] })).toThrow(
      InvalidDiagramError
    )
    expect(readArtifactFile(waycairnDir, 'diagram', 'bad')).toBeNull()
  })
})
