export interface HighlightEdgeRef {
  id: string
  from: string
  to: string
}

export interface HighlightResult {
  nodeIds: Set<string>
  edgeIds: Set<string>
}

// ponytail: empty sets mean "nothing hovered, dim nothing" — callers must
// treat an empty nodeIds set as "show everything at full opacity", not as
// "nothing is highlighted so dim everything".
export function computeHighlightedIds(hoveredNodeId: string | null, edges: HighlightEdgeRef[]): HighlightResult {
  if (!hoveredNodeId) return { nodeIds: new Set(), edgeIds: new Set() }

  const nodeIds = new Set<string>([hoveredNodeId])
  const edgeIds = new Set<string>()

  for (const edge of edges) {
    if (edge.from === hoveredNodeId || edge.to === hoveredNodeId) {
      edgeIds.add(edge.id)
      nodeIds.add(edge.from)
      nodeIds.add(edge.to)
    }
  }

  return { nodeIds, edgeIds }
}
