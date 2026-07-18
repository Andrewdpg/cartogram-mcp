import { describe, it, expect } from 'vitest'
import { validateDiagramArtifactData } from './diagram.js'
import { InvalidDiagramError } from '../../validateDiagramShape.js'

describe('validateDiagramArtifactData', () => {
  it('accepts valid { notation, nodes, edges } data with no id/title required', () => {
    expect(() =>
      validateDiagramArtifactData(
        { notation: 'c4', nodes: [{ id: 'a', label: 'A', kind: 'service' }], edges: [] },
        'auth-service'
      )
    ).not.toThrow()
  })

  it('rejects non-object data', () => {
    expect(() => validateDiagramArtifactData('not an object', 'auth-service')).toThrow(InvalidDiagramError)
  })

  it('rejects a node with an invalid kind', () => {
    expect(() =>
      validateDiagramArtifactData({ nodes: [{ id: 'a', label: 'A', kind: 'boundary' }], edges: [] }, 'auth-service')
    ).toThrow(/invalid "kind"/)
  })

  it('rejects an edge referencing an unknown node', () => {
    expect(() =>
      validateDiagramArtifactData(
        { nodes: [{ id: 'a', label: 'A', kind: 'service' }], edges: [{ from: 'a', to: 'ghost' }] },
        'auth-service'
      )
    ).toThrow(/unknown node "ghost"/)
  })
})
