import { validateDiagramShape, InvalidDiagramError } from '../validateDiagramShape.js'

// Accepts just { nodes, edges } — the same shape create_diagram/
// update_diagram's own `content` parameter takes, and the only shape an
// agent doing a pre-flight check before either of those calls actually
// has on hand. validateDiagramShape itself requires id/title (a full
// diagram document, matching what's stored in Postgres), so those tools
// wrap content with placeholders before calling it — this tool must do
// the same, or every real call fails with "missing id" regardless of
// whether nodes/edges themselves are valid. That mismatch — this
// function's caller error, not a validateDiagramShape bug — is what made
// validate_diagram appear broken for every payload in practice.
export function validateDiagramTool(content: unknown): { valid: true } | { valid: false; reason: string } {
  if (typeof content !== 'object' || content === null) {
    return { valid: false, reason: 'content must be an object with "nodes" and "edges" arrays' }
  }
  try {
    validateDiagramShape({ id: 'candidate', title: 'candidate', ...content }, 'candidate')
    return { valid: true }
  } catch (err) {
    if (err instanceof InvalidDiagramError) {
      return { valid: false, reason: err.message }
    }
    throw err
  }
}
