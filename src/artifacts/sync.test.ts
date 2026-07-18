import { describe, it, expect, beforeEach, afterEach, vi, afterAll } from 'vitest'
import { mkdtempSync, rmSync, utimesSync, readFileSync as originalReadFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { DatabaseSync } from 'node:sqlite'
import { openIndexDb, getIndexRow, upsertIndexRow, listIndexedIds } from './db.js'
import { writeArtifactFile } from './store.js'
import { reindexKind } from './sync.js'

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs')
  return {
    ...actual,
  }
})

let waycairnDir: string
let db: DatabaseSync

beforeEach(() => {
  waycairnDir = mkdtempSync(join(tmpdir(), 'waycairn-sync-'))
  db = openIndexDb(waycairnDir)
})

afterEach(() => {
  db.close()
  rmSync(waycairnDir, { recursive: true, force: true })
})

describe('reindexKind', () => {
  it('indexes a file that was never indexed before', () => {
    writeArtifactFile(waycairnDir, { id: 'a', kind: 'diagram', updatedAt: 't1', data: { v: 1 } })
    reindexKind(waycairnDir, db, 'diagram')
    const row = getIndexRow(db, 'diagram', 'a')
    expect(row).not.toBeNull()
    expect(JSON.parse(row!.dataJson)).toEqual({ v: 1 })
  })

  it('does nothing when the kind directory does not exist', () => {
    expect(() => reindexKind(waycairnDir, db, 'diagram')).not.toThrow()
    expect(listIndexedIds(db, 'diagram')).toEqual([])
  })

  it('re-reads a file whose mtime changed since it was indexed', () => {
    writeArtifactFile(waycairnDir, { id: 'a', kind: 'diagram', updatedAt: 't1', data: { v: 1 } })
    reindexKind(waycairnDir, db, 'diagram')

    // Simulate a later edit (e.g. a git checkout that changed the file) by
    // bumping its mtime forward and rewriting its content directly, bypassing
    // the index — this is exactly the out-of-band case reindexKind exists for.
    writeArtifactFile(waycairnDir, { id: 'a', kind: 'diagram', updatedAt: 't2', data: { v: 2 } })
    const future = new Date(Date.now() + 60_000)
    utimesSync(join(waycairnDir, 'diagram', 'a.json'), future, future)

    reindexKind(waycairnDir, db, 'diagram')
    const row = getIndexRow(db, 'diagram', 'a')
    expect(JSON.parse(row!.dataJson)).toEqual({ v: 2 })
  })

  it('skips re-reading a file whose mtime has not changed', async () => {
    writeArtifactFile(waycairnDir, { id: 'a', kind: 'diagram', updatedAt: 't1', data: { v: 1 } })
    reindexKind(waycairnDir, db, 'diagram')

    const fs = await import('node:fs')
    const readSpy = vi.spyOn(fs, 'readFileSync')
    reindexKind(waycairnDir, db, 'diagram')
    // Only the (empty) directory listing happens — no per-file re-read.
    expect(readSpy).not.toHaveBeenCalledWith(expect.stringContaining('a.json'), 'utf8')
    readSpy.mockRestore()
  })

  it('drops an index row whose file was deleted', () => {
    upsertIndexRow(db, { kind: 'diagram', id: 'gone', dataJson: '{}', updatedAt: 't1', indexedMtimeMs: 1 })
    reindexKind(waycairnDir, db, 'diagram')
    expect(getIndexRow(db, 'diagram', 'gone')).toBeNull()
  })
})
