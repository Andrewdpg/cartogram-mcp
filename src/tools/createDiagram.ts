import { supabaseForUser } from '../supabaseForUser.js'
import { requireScope } from '../requireScope.js'
import type { McpTokenClaims } from '../mcpToken.js'
import type { DiagramNodeData, DiagramEdgeData, Notation } from '../validateDiagramShape.js'

export async function createDiagramTool(
  claims: McpTokenClaims,
  projectId: string,
  slug: string,
  title: string,
  notation: Notation,
  content: { nodes: DiagramNodeData[]; edges: DiagramEdgeData[] }
): Promise<void> {
  requireScope(claims, 'write')
  const supabase = supabaseForUser(claims.supabaseAccessToken)
  const { error } = await supabase
    .from('diagrams')
    .insert({ project_id: projectId, slug, title, notation, content })
  if (error) throw error
}
