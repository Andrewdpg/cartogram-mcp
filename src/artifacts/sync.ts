import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { DatabaseSync } from 'node:sqlite'
import { deleteIndexRow, listIndexRows, upsertIndexRow } from './db.js'
import type { ArtifactRecord } from './store.js'

export function reindexKind(waycairnDir: string, db: DatabaseSync, kind: string): void {
  const dir = join(waycairnDir, kind)
  const indexed = new Map(listIndexRows(db, kind).map((row) => [row.id, row]))
  const onDiskIds = new Set<string>()

  if (existsSync(dir)) {
    for (const name of readdirSync(dir)) {
      if (!name.endsWith('.json')) continue
      const id = name.slice(0, -'.json'.length)
      onDiskIds.add(id)

      const filePath = join(dir, name)
      const mtimeMs = statSync(filePath).mtimeMs
      const existing = indexed.get(id)
      if (existing && existing.indexedMtimeMs === mtimeMs) continue // already fresh

      const record = JSON.parse(readFileSync(filePath, 'utf8')) as ArtifactRecord
      upsertIndexRow(db, {
        kind,
        id,
        dataJson: JSON.stringify(record.data),
        updatedAt: record.updatedAt,
        indexedMtimeMs: mtimeMs,
      })
    }
  }

  for (const indexedId of indexed.keys()) {
    if (!onDiskIds.has(indexedId)) deleteIndexRow(db, kind, indexedId)
  }
}
