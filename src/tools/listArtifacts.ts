import { openIndexDb, listIndexRows } from '../artifacts/db.js'
import { reindexKind } from '../artifacts/sync.js'
import type { ArtifactRecord } from '../artifacts/store.js'

export function listArtifactsTool(waycairnDir: string, kind: string): ArtifactRecord[] {
  const db = openIndexDb(waycairnDir)
  try {
    reindexKind(waycairnDir, db, kind)
    return listIndexRows(db, kind).map((row) => ({
      id: row.id,
      kind: row.kind,
      updatedAt: row.updatedAt,
      data: JSON.parse(row.dataJson),
    }))
  } finally {
    db.close()
  }
}
