import { supabaseForUser } from '../supabaseForUser.js'
import { requireScope } from '../requireScope.js'
import type { McpTokenClaims } from '../mcpToken.js'

export async function createProjectTool(
  claims: McpTokenClaims,
  name: string
): Promise<{ id: string; name: string }> {
  requireScope(claims, 'write')
  const supabase = supabaseForUser(claims.supabaseAccessToken)

  const { data, error } = await supabase
    .from('projects')
    .insert({ name, owner_id: claims.userId })
    .select('id, name')
    .single()
  if (error) throw error

  const { error: grantError } = await supabase
    .from('mcp_project_grants')
    .insert({ project_id: data.id, user_id: claims.userId })
  if (grantError) throw grantError

  return data
}
