import { validateDiagramShape, InvalidDiagramError } from '../../validateDiagramShape.js'

// validateDiagramShape validates a full { id, title, nodes, edges } document
// (the shape stored today under the old Supabase-backed diagrams table). An
// artifact's `data` for kind="diagram" is just { notation, nodes, edges } —
// the artifact's own `id` field already IS the diagram id, and there is no
// separate title. Wrapping with placeholders reuses the tested node/edge/
// unknown-field validation instead of re-implementing it — same trick
// validateDiagramTool (src/tools/validateDiagram.ts) already uses for the
// old create_diagram/update_diagram tools.
export function validateDiagramArtifactData(data: unknown, artifactId: string): void {
  if (typeof data !== 'object' || data === null) {
    throw new InvalidDiagramError(artifactId, 'data must be an object with "nodes" and "edges" arrays')
  }
  validateDiagramShape({ id: artifactId, title: artifactId, ...data }, artifactId)
}
