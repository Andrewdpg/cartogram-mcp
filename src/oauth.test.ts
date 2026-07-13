import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'

// allowedRedirectUris is read once at oauth.ts's module load. Static imports
// in ESM/TS always evaluate before any of this file's own top-level
// statements, regardless of source order — a plain
// `process.env.X = ...` placed above the `import` below would run AFTER
// oauth.ts has already been evaluated. vi.hoisted runs before all imports
// are resolved, which is what actually gets this env var set in time.
vi.hoisted(() => {
  process.env.MCP_OAUTH_ALLOWED_REDIRECT_URIS = 'https://claude.ai/callback'
})

import { createOAuthRouter } from './oauth.js'
import { markMcpSession } from './mcpSessions.js'

vi.mock('./mcpToken', () => ({
  mintMcpToken: vi.fn(() => 'minted-mcp-token'),
}))

vi.mock('./mcpSessions', () => ({
  markMcpSession: vi.fn().mockResolvedValue(undefined),
}))

describe('POST /oauth/token', () => {
  let app: express.Express

  beforeEach(() => {
    app = express()
    app.use(express.json())
    app.use('/oauth', createOAuthRouter())
  })

  it('rejects a token exchange for an unknown/expired authorization code', async () => {
    const res = await request(app)
      .post('/oauth/token')
      .send({
        grant_type: 'authorization_code',
        code: 'does-not-exist',
        code_verifier: 'irrelevant',
        client_id: 'claude-code',
      })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('invalid_grant')
  })

  it('exchanges a valid code + matching PKCE verifier for an mcp access token', async () => {
    const authRes = await request(app).get('/oauth/authorize').query({
      response_type: 'code',
      client_id: 'claude-code',
      redirect_uri: 'https://claude.ai/callback',
      code_challenge: 'YmFzZTY0dXJsLWNoYWxsZW5nZQ', // base64url("base64url-challenge")-shaped placeholder
      code_challenge_method: 'plain',
      scope: 'read write',
      state: 'xyz',
    })
    // /authorize redirects with ?code=... in a real browser flow; the test
    // extracts the code from the Location header the same way a client would.
    const location = new URL(authRes.headers.location!)
    const code = location.searchParams.get('code')!

    const res = await request(app).post('/oauth/token').send({
      grant_type: 'authorization_code',
      code,
      code_verifier: 'YmFzZTY0dXJsLWNoYWxsZW5nZQ',
      client_id: 'claude-code',
    })
    expect(res.status).toBe(200)
    expect(res.body.access_token).toBe('minted-mcp-token')
    expect(markMcpSession).toHaveBeenCalledWith(expect.any(String), 'placeholder-user-id')
  })
})

describe('GET /oauth/authorize', () => {
  let app: express.Express

  beforeEach(() => {
    app = express()
    app.use(express.json())
    app.use('/oauth', createOAuthRouter())
  })

  it('rejects a redirect_uri that is not on the configured allowlist', async () => {
    const res = await request(app).get('/oauth/authorize').query({
      response_type: 'code',
      client_id: 'claude-code',
      redirect_uri: 'https://attacker.example/steal',
      code_challenge: 'YmFzZTY0dXJsLWNoYWxsZW5nZQ',
      code_challenge_method: 'plain',
      scope: 'read',
      state: 'xyz',
    })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('invalid_request')
  })
})
