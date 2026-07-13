import { describe, it, expect, vi } from 'vitest'

const eq = vi.fn()
vi.mock('../supabaseForUser', () => ({
  supabaseForUser: vi.fn(() => ({ from: () => ({ select: () => ({ eq }) }) })),
}))

import { listDiagramsTool } from './listDiagrams.js'
import type { McpTokenClaims } from '../mcpToken.js'

describe('listDiagramsTool', () => {
  it('lists every diagram slug/title in a project — including ones no node references, which get_diagram alone cannot discover', async () => {
    eq.mockResolvedValue({
      data: [
        { slug: 'deployment', title: 'Deployment' },
        { slug: 'docker-host-detail', title: 'Docker Host — Detail' },
      ],
      error: null,
    })
    const claims: McpTokenClaims = { userId: 'u1', scopes: ['read'], supabaseAccessToken: 'tok' }
    const result = await listDiagramsTool(claims, 'proj-1')
    expect(result).toEqual([
      { slug: 'deployment', title: 'Deployment' },
      { slug: 'docker-host-detail', title: 'Docker Host — Detail' },
    ])
  })

  it('rejects when the token lacks read scope', async () => {
    const claims: McpTokenClaims = { userId: 'u1', scopes: [], supabaseAccessToken: 'tok' }
    await expect(listDiagramsTool(claims, 'proj-1')).rejects.toThrow(/missing required scope: read/)
  })
})
