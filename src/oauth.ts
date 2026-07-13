import { Router } from 'express'
import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import { mintMcpToken } from './mcpToken.js'
import { markMcpSession } from './mcpSessions.js'

interface PendingAuthorization {
  codeChallenge: string
  codeChallengeMethod: 'plain' | 'S256'
  scopes: ('read' | 'write' | 'admin')[]
  supabaseAccessToken: string
  userId: string
  redirectUri: string
  createdAt: number
}

// In-memory store — a single-instance dev/first-deploy assumption.
// ponytail: swap for a shared store (Redis, or a Supabase table) if/when
// this service runs as more than one instance behind a load balancer.
const pendingCodes = new Map<string, PendingAuthorization>()
const CODE_TTL_MS = 5 * 60 * 1000
const MAX_PENDING_CODES = 10_000

function verifyPkce(verifier: string, challenge: string, method: 'plain' | 'S256'): boolean {
  if (method === 'plain') return verifier === challenge
  const hashed = crypto.createHash('sha256').update(verifier).digest('base64url')
  return hashed === challenge
}

// Comma-separated allowlist of exact redirect_uri values this server will
// hand an authorization code to. Without this, /authorize is an open
// redirect that also leaks the code itself: anyone can pass
// redirect_uri=https://attacker.example/steal and have this endpoint
// forward the code there. MCP clients (e.g. Claude Code) typically redirect
// to a fixed loopback/HTTPS callback registered out of band — configure
// that value here.
const allowedRedirectUris = new Set(
  (process.env.MCP_OAUTH_ALLOWED_REDIRECT_URIS ?? '').split(',').map((s) => s.trim()).filter(Boolean)
)

function isAllowedRedirectUri(redirectUri: string | undefined): redirectUri is string {
  return typeof redirectUri === 'string' && allowedRedirectUris.has(redirectUri)
}

function pruneExpiredCodes(): void {
  const now = Date.now()
  for (const [code, pending] of pendingCodes) {
    if (now - pending.createdAt > CODE_TTL_MS) {
      pendingCodes.delete(code)
    }
  }
}

export function createOAuthRouter(): Router {
  const router = Router()

  // NOTE: this handler assumes the caller already has a valid Supabase
  // session (see Task 4's design note) — the query params below stand in
  // for what a real request carries once wired to the frontend's login
  // flow in a later task; this synthesizes a placeholder session for now
  // so the authorization-code + PKCE mechanics can be tested independently
  // of the login UI.
  router.get('/authorize', (req, res) => {
    const { redirect_uri, code_challenge, code_challenge_method, scope, state } = req.query as Record<
      string,
      string
    >

    if (!isAllowedRedirectUri(redirect_uri)) {
      return res.status(400).json({ error: 'invalid_request', error_description: 'unregistered redirect_uri' })
    }

    pruneExpiredCodes()
    if (pendingCodes.size >= MAX_PENDING_CODES) {
      return res.status(503).json({ error: 'temporarily_unavailable' })
    }

    const code = crypto.randomBytes(24).toString('base64url')
    // Placeholder session — see the design note above. Shaped as a decodable
    // JWT (not a bare string) carrying sub/session_id, matching what a real
    // Supabase access token looks like, so the /token handler's
    // jwt.decode(...).session_id read below exercises the real code path
    // end to end even before real session wiring lands.
    const placeholderUserId = 'placeholder-user-id'
    const placeholderSupabaseAccessToken = jwt.sign(
      { sub: placeholderUserId, session_id: crypto.randomUUID() },
      'placeholder-unsigned-dev-only',
      { noTimestamp: true }
    )
    pendingCodes.set(code, {
      codeChallenge: code_challenge,
      codeChallengeMethod: (code_challenge_method as 'plain' | 'S256') ?? 'S256',
      scopes: (scope ?? 'read').split(' ') as ('read' | 'write' | 'admin')[],
      supabaseAccessToken: placeholderSupabaseAccessToken,
      userId: placeholderUserId,
      redirectUri: redirect_uri,
      createdAt: Date.now(),
    })

    const location = new URL(redirect_uri)
    location.searchParams.set('code', code)
    if (state) location.searchParams.set('state', state)
    res.redirect(location.toString())
  })

  router.post('/token', async (req, res) => {
    const { grant_type, code, code_verifier } = req.body as Record<string, string>

    if (grant_type !== 'authorization_code') {
      return res.status(400).json({ error: 'unsupported_grant_type' })
    }

    const pending = pendingCodes.get(code)
    if (!pending || Date.now() - pending.createdAt > CODE_TTL_MS) {
      return res.status(400).json({ error: 'invalid_grant' })
    }
    pendingCodes.delete(code)

    if (!verifyPkce(code_verifier, pending.codeChallenge, pending.codeChallengeMethod)) {
      return res.status(400).json({ error: 'invalid_grant' })
    }

    // Marks the specific Supabase auth.sessions row backing
    // pending.supabaseAccessToken as MCP-originated, so the
    // custom_access_token_hook Postgres function (see the mcp_sessions
    // migration) stamps is_mcp_request: true only on tokens re-issued for
    // THIS session — which is what the mcp_project_grants RLS policies
    // actually check. Decoded (not verified) here: the token's signature
    // was already established by Supabase Auth when this session was
    // created; this server only needs to read its session_id claim, not
    // authorize anything based on it.
    const supabaseClaims = jwt.decode(pending.supabaseAccessToken) as { session_id?: string } | null
    if (!supabaseClaims?.session_id) {
      return res.status(400).json({ error: 'invalid_grant' })
    }
    await markMcpSession(supabaseClaims.session_id, pending.userId)

    const accessToken = mintMcpToken({
      userId: pending.userId,
      scopes: pending.scopes,
      supabaseAccessToken: pending.supabaseAccessToken,
    })

    res.json({ access_token: accessToken, token_type: 'Bearer', expires_in: 3600 })
  })

  return router
}
