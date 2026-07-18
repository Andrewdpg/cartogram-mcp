import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { DatabaseSync } from 'node:sqlite'
import { openIndexDb, upsertIndexRow, deleteIndexRow, getIndexRow, listIndexRows, listIndexedIds } from './db.js'

let waycairnDir: string
let db: DatabaseSync

beforeEach(() => {
  waycairnDir = mkdtempSync(join(tmpdir(), 'waycairn-db-'))
  db = openIndexDb(waycairnDir)
})

afterEach(() => {
  db.close()
  rmSync(waycairnDir, { recursive: true, force: true })
})

describe('sqlite index', () => {
  it('returns null for a row that was never indexed', () => {
    expect(getIndexRow(db, 'diagram', 'missing')).toBeNull()
  })

  it('upserts and reads back a row', () => {
    upsertIndexRow(db, { kind: 'diagram', id: 'a', dataJson: '{"v":1}', updatedAt: 't1', indexedMtimeMs: 100 })
    expect(getIndexRow(db, 'diagram', 'a')).toEqual({
      kind: 'diagram',
      id: 'a',
      dataJson: '{"v":1}',
      updatedAt: 't1',
      indexedMtimeMs: 100,
    })
  })

  it('overwrites the row on a second upsert with the same kind+id', () => {
    upsertIndexRow(db, { kind: 'diagram', id: 'a', dataJson: '{"v":1}', updatedAt: 't1', indexedMtimeMs: 100 })
    upsertIndexRow(db, { kind: 'diagram', id: 'a', dataJson: '{"v":2}', updatedAt: 't2', indexedMtimeMs: 200 })
    expect(getIndexRow(db, 'diagram', 'a')).toEqual({
      kind: 'diagram',
      id: 'a',
      dataJson: '{"v":2}',
      updatedAt: 't2',
      indexedMtimeMs: 200,
    })
  })

  it('deletes a row', () => {
    upsertIndexRow(db, { kind: 'diagram', id: 'a', dataJson: '{}', updatedAt: 't1', indexedMtimeMs: 100 })
    deleteIndexRow(db, 'diagram', 'a')
    expect(getIndexRow(db, 'diagram', 'a')).toBeNull()
  })

  it('lists rows for a kind, ordered by id, excluding other kinds', () => {
    upsertIndexRow(db, { kind: 'diagram', id: 'b', dataJson: '{}', updatedAt: 't1', indexedMtimeMs: 1 })
    upsertIndexRow(db, { kind: 'diagram', id: 'a', dataJson: '{}', updatedAt: 't1', indexedMtimeMs: 1 })
    upsertIndexRow(db, { kind: 'session-note', id: 'z', dataJson: '{}', updatedAt: 't1', indexedMtimeMs: 1 })
    expect(listIndexRows(db, 'diagram').map((r) => r.id)).toEqual(['a', 'b'])
  })

  it('lists just the ids for a kind', () => {
    upsertIndexRow(db, { kind: 'diagram', id: 'a', dataJson: '{}', updatedAt: 't1', indexedMtimeMs: 1 })
    expect(listIndexedIds(db, 'diagram')).toEqual(['a'])
  })

  it('persists across a reopen of the same waycairnDir', () => {
    upsertIndexRow(db, { kind: 'diagram', id: 'a', dataJson: '{}', updatedAt: 't1', indexedMtimeMs: 1 })
    db.close()
    db = openIndexDb(waycairnDir)
    expect(getIndexRow(db, 'diagram', 'a')).not.toBeNull()
  })
})
