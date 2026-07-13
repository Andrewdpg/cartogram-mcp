import jwt from 'jsonwebtoken'

export interface McpTokenClaims {
  userId: string
  scopes: ('read' | 'write' | 'admin')[]
  supabaseAccessToken: string
}

const secret = process.env.MCP_JWT_SIGNING_SECRET
if (!secret) {
  throw new Error('Missing MCP_JWT_SIGNING_SECRET environment variable')
}

export function mintMcpToken(claims: McpTokenClaims): string {
  return jwt.sign(claims, secret!, { expiresIn: '1h', algorithm: 'HS256' })
}

export function verifyMcpToken(token: string): McpTokenClaims {
  // algorithms is pinned explicitly, not left to jsonwebtoken's default:
  // without it, verify() accepts any algorithm the library supports keyed
  // by this same secret, which is the standard "algorithm confusion" class
  // of JWT vulnerability. Since this token is only ever HS256-signed by
  // mintMcpToken above, verification must reject anything else.
  return jwt.verify(token, secret!, { algorithms: ['HS256'] }) as McpTokenClaims & {
    iat: number
    exp: number
  }
}
