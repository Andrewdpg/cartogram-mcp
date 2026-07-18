import { validateArtifactData } from '../artifacts/kinds/registry.js'

export function validateArtifactTool(kind: string, data: unknown): { valid: true } | { valid: false; reason: string } {
  try {
    validateArtifactData(kind, data, 'candidate')
    return { valid: true }
  } catch (err) {
    if (err instanceof Error) return { valid: false, reason: err.message }
    throw err
  }
}
