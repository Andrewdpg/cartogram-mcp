import { supabaseForUser } from '../supabaseForUser.js'
import { requireScope } from '../requireScope.js'
import { throwSupabaseError } from '../supabaseError.js'
import type { McpTokenClaims } from '../mcpToken.js'

export async function listDiagramsTool(
  claims: McpTokenClaims,
  projectId: string
): Promise<{ slug: string; title: string }[]> {
  requireScope(claims, 'read')
  const supabase = supabaseForUser(claims.supabaseAccessToken)
  const { data, error } = await supabase.from('diagrams').select('slug, title').eq('project_id', projectId)
  if (error) throwSupabaseError(error)
  return data ?? []
}
