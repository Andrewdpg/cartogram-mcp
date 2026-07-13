import { describe, it, expect } from 'vitest'
import jwt from 'jsonwebtoken'
import { mintMcpToken, verifyMcpToken } from './mcpToken.js'

describe('mcpToken', () => {
  it('round-trips claims through mint and verify', () => {
    const token = mintMcpToken({
      userId: 'user-123',
      scopes: ['read', 'write'],
      supabaseAccessToken: 'supabase-jwt-abc',
    })
    const claims = verifyMcpToken(token)
    expect(claims.userId).toBe('user-123')
    expect(claims.scopes).toEqual(['read', 'write'])
    expect(claims.supabaseAccessToken).toBe('supabase-jwt-abc')
  })

  it('throws on a tampered token', () => {
    const token = mintMcpToken({ userId: 'u', scopes: ['read'], supabaseAccessToken: 't' })
    const tampered = token.slice(0, -2) + 'xx'
    expect(() => verifyMcpToken(tampered)).toThrow()
  })

  it('rejects an alg:none token even if its payload claims admin scope', () => {
    // Forged with the classic JWT "alg: none" bypass: no signature at all.
    // If verifyMcpToken didn't pin algorithms: ['HS256'], a permissive
    // jsonwebtoken configuration could accept this.
    const forged = jwt.sign(
      { userId: 'attacker', scopes: ['admin'], supabaseAccessToken: 'anything' },
      '',
      { algorithm: 'none' }
    )
    expect(() => verifyMcpToken(forged)).toThrow()
  })
})
