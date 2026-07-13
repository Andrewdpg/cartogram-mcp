import { supabaseForUser } from '../supabaseForUser.js'
import { requireScope } from '../requireScope.js'
import type { McpTokenClaims } from '../mcpToken.js'
import type { DiagramNodeData, DiagramEdgeData } from '../validateDiagramShape.js'

export async function updateDiagramTool(
  claims: McpTokenClaims,
  projectId: string,
  slug: string,
  content: { nodes: DiagramNodeData[]; edges: DiagramEdgeData[] },
  expectedVersion: number
): Promise<{ version: number } | { conflict: true }> {
  requireScope(claims, 'write')
  const supabase = supabaseForUser(claims.supabaseAccessToken)

  const { data, error } = await supabase
    .from('diagrams')
    .update({ content, version: expectedVersion + 1, updated_at: new Date().toISOString() })
    .eq('project_id', projectId)
    .eq('slug', slug)
    .eq('version', expectedVersion)
    .select('version')
    .single()

  if (error || !data) {
    return { conflict: true }
  }
  return { version: data.version }
}
