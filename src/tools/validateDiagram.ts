import { validateDiagramShape, InvalidDiagramError } from '../validateDiagramShape.js'

export function validateDiagramTool(content: unknown): { valid: true } | { valid: false; reason: string } {
  try {
    validateDiagramShape(content, 'candidate')
    return { valid: true }
  } catch (err) {
    if (err instanceof InvalidDiagramError) {
      return { valid: false, reason: err.message }
    }
    throw err
  }
}
