import { statSync } from 'node:fs'
import { openIndexDb, upsertIndexRow } from '../artifacts/db.js'
import { artifactFilePath, writeArtifactFile, type ArtifactRecord } from '../artifacts/store.js'
import { validateArtifactData } from '../artifacts/kinds/registry.js'

export function upsertArtifactTool(waycairnDir: string, kind: string, id: string, data: unknown): ArtifactRecord {
  validateArtifactData(kind, data, id) // throws before anything is written on invalid input

  const record: ArtifactRecord = { id, kind, updatedAt: new Date().toISOString(), data }
  writeArtifactFile(waycairnDir, record)

  const db = openIndexDb(waycairnDir)
  try {
    const mtimeMs = statSync(artifactFilePath(waycairnDir, kind, id)).mtimeMs
    upsertIndexRow(db, { kind, id, dataJson: JSON.stringify(data), updatedAt: record.updatedAt, indexedMtimeMs: mtimeMs })
  } finally {
    db.close()
  }

  return record
}
