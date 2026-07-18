import { DatabaseSync } from 'node:sqlite'
import { join } from 'node:path'
import { mkdirSync } from 'node:fs'

export interface IndexRow {
  kind: string
  id: string
  dataJson: string
  updatedAt: string
  indexedMtimeMs: number
}

export function openIndexDb(waycairnDir: string): DatabaseSync {
  mkdirSync(waycairnDir, { recursive: true })
  const db = new DatabaseSync(join(waycairnDir, 'index.sqlite'))
  db.exec(`
    CREATE TABLE IF NOT EXISTS artifacts (
      kind TEXT NOT NULL,
      id TEXT NOT NULL,
      data_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      indexed_mtime_ms REAL NOT NULL,
      PRIMARY KEY (kind, id)
    )
  `)
  return db
}

interface ArtifactRow {
  kind: string
  id: string
  data_json: string
  updated_at: string
  indexed_mtime_ms: number
}

function toIndexRow(row: ArtifactRow): IndexRow {
  return { kind: row.kind, id: row.id, dataJson: row.data_json, updatedAt: row.updated_at, indexedMtimeMs: row.indexed_mtime_ms }
}

export function upsertIndexRow(db: DatabaseSync, row: IndexRow): void {
  db.prepare(
    `INSERT INTO artifacts (kind, id, data_json, updated_at, indexed_mtime_ms)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(kind, id) DO UPDATE SET
       data_json = excluded.data_json,
       updated_at = excluded.updated_at,
       indexed_mtime_ms = excluded.indexed_mtime_ms`
  ).run(row.kind, row.id, row.dataJson, row.updatedAt, row.indexedMtimeMs)
}

export function deleteIndexRow(db: DatabaseSync, kind: string, id: string): void {
  db.prepare(`DELETE FROM artifacts WHERE kind = ? AND id = ?`).run(kind, id)
}

export function getIndexRow(db: DatabaseSync, kind: string, id: string): IndexRow | null {
  const row = db.prepare(`SELECT * FROM artifacts WHERE kind = ? AND id = ?`).get(kind, id) as ArtifactRow | undefined
  return row ? toIndexRow(row) : null
}

export function listIndexRows(db: DatabaseSync, kind: string): IndexRow[] {
  const rows = db.prepare(`SELECT * FROM artifacts WHERE kind = ? ORDER BY id`).all(kind) as ArtifactRow[]
  return rows.map(toIndexRow)
}

export function listIndexedIds(db: DatabaseSync, kind: string): string[] {
  const rows = db.prepare(`SELECT id FROM artifacts WHERE kind = ?`).all(kind) as Array<{ id: string }>
  return rows.map((r) => r.id)
}
