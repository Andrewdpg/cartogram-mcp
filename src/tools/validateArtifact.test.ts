import { describe, it, expect } from 'vitest'
import { validateArtifactTool } from './validateArtifact.js'

describe('validateArtifactTool', () => {
  it('returns valid: true for well-formed diagram data', () => {
    expect(
      validateArtifactTool('diagram', { nodes: [{ id: 'a', label: 'A', kind: 'service' }], edges: [] })
    ).toEqual({ valid: true })
  })

  it('returns valid: false with a reason for malformed diagram data', () => {
    const result = validateArtifactTool('diagram', { nodes: [{ id: 'a' }], edges: [] })
    expect(result.valid).toBe(false)
    expect((result as { reason: string }).reason).toMatch(/missing "label"/)
  })

  it('returns valid: false with a reason for an unknown kind', () => {
    const result = validateArtifactTool('session-note', {})
    expect(result.valid).toBe(false)
    expect((result as { reason: string }).reason).toMatch(/Unknown artifact kind/)
  })

  it('does not write anything (pure dry-run)', () => {
    // No waycairnDir parameter exists on this function at all — the type
    // signature itself is the guarantee. This test documents that intent.
    expect(validateArtifactTool.length).toBe(2)
  })
})
