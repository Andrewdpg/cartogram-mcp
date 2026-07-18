import { openIndexDb, getIndexRow } from '../artifacts/db.js'
import { reindexKind } from '../artifacts/sync.js'
import type { ArtifactRecord } from '../artifacts/store.js'

export function getArtifactTool(waycairnDir: string, kind: string, id: string): ArtifactRecord | null {
  const db = openIndexDb(waycairnDir)
  try {
    reindexKind(waycairnDir, db, kind)
    const row = getIndexRow(db, kind, id)
    if (!row) return null
    return { id: row.id, kind: row.kind, updatedAt: row.updatedAt, data: JSON.parse(row.dataJson) }
  } finally {
    db.close()
  }
}
