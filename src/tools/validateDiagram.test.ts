import { describe, it, expect } from 'vitest'
import { validateDiagramTool } from './validateDiagram.js'

describe('validateDiagramTool', () => {
  it('returns valid: true for a well-formed diagram', () => {
    const result = validateDiagramTool({
      id: 'd', title: 'D', nodes: [{ id: 'a', label: 'A', kind: 'service' }], edges: [],
    })
    expect(result).toEqual({ valid: true })
  })

  it('returns valid: false with a reason for a malformed diagram', () => {
    const result = validateDiagramTool({ id: 'd', title: 'D', nodes: [{ id: 'a' }], edges: [] })
    expect(result.valid).toBe(false)
    expect((result as { reason: string }).reason).toMatch(/missing "label"/)
  })
})
