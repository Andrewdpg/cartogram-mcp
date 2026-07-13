import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRoleKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
}

const SESSION_TTL_MS = 60 * 60 * 1000 // matches mintMcpToken's 1h token expiry

// service_role is required here, unlike every other Supabase call in this
// service: this write happens during the OAuth /token exchange, before any
// user-scoped RLS context exists for the user being marked, and
// mcp_sessions intentionally has no authenticated-role grant (see its
// migration) — there is no anon-key-plus-user-token path that could
// perform this specific upsert. This is the one deliberate exception to
// "every Supabase call runs as the authenticated end user."
const supabase = createClient(url, serviceRoleKey)

// Keyed by sessionId (the Supabase auth.sessions row this specific token
// belongs to), NOT userId — see the mcp_sessions migration's note. Marking
// by userId would also flag the same person's unrelated browser session as
// an MCP request the next time Supabase issued it a token.
export async function markMcpSession(sessionId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('mcp_sessions').upsert({
    session_id: sessionId,
    user_id: userId,
    expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  })
  if (error) throw new Error(error.message)
}
