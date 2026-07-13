import { describe, it, expect, vi } from 'vitest'

const projectInsertSingle = vi.fn()
const grantInsert = vi.fn()
vi.mock('../supabaseForUser', () => ({
  supabaseForUser: vi.fn(() => ({
    from: (table: string) => {
      if (table === 'projects') {
        return { insert: () => ({ select: () => ({ single: projectInsertSingle }) }) }
      }
      if (table === 'mcp_project_grants') {
        return { insert: grantInsert }
      }
      throw new Error(`unexpected table ${table}`)
    },
  })),
}))

import { createProjectTool } from './createProject.js'
import type { McpTokenClaims } from '../mcpToken.js'

describe('createProjectTool', () => {
  it('creates the project and auto-grants mcp access to it', async () => {
    projectInsertSingle.mockResolvedValue({ data: { id: 'new-p', name: 'New' }, error: null })
    grantInsert.mockResolvedValue({ error: null })
    const claims: McpTokenClaims = { userId: 'u1', scopes: ['write'], supabaseAccessToken: 'tok' }

    const result = await createProjectTool(claims, 'New')

    expect(result).toEqual({ id: 'new-p', name: 'New' })
    expect(grantInsert).toHaveBeenCalledWith({ project_id: 'new-p', user_id: 'u1' })
  })

  it('rejects when the token lacks write scope', async () => {
    const claims: McpTokenClaims = { userId: 'u1', scopes: ['read'], supabaseAccessToken: 'tok' }
    await expect(createProjectTool(claims, 'New')).rejects.toThrow(/missing required scope: write/)
  })
})
