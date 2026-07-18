import { describe, it, expect } from 'vitest'
import { validateArtifactData, UnknownArtifactKindError, ARTIFACT_KINDS } from './registry.js'
import { InvalidDiagramError } from '../../validateDiagramShape.js'

describe('validateArtifactData', () => {
  it('lists "diagram" as a known kind', () => {
    expect(ARTIFACT_KINDS).toContain('diagram')
  })

  it('delegates to the diagram validator for kind="diagram"', () => {
    expect(() =>
      validateArtifactData('diagram', { nodes: [{ id: 'a', label: 'A', kind: 'service' }], edges: [] }, 'x')
    ).not.toThrow()
  })

  it('surfaces the diagram validator error for invalid diagram data', () => {
    expect(() => validateArtifactData('diagram', { nodes: [{ id: 'a' }], edges: [] }, 'x')).toThrow(
      InvalidDiagramError
    )
  })

  it('rejects an unknown kind, listing the known ones in the error', () => {
    expect(() => validateArtifactData('session-note', {}, 'x')).toThrow(UnknownArtifactKindError)
    expect(() => validateArtifactData('session-note', {}, 'x')).toThrow(/diagram/)
  })
})
