import { describe, it, expect } from 'vitest'
import { computeHighlightedIds } from './hoverHighlight'

describe('computeHighlightedIds', () => {
  it('returns empty sets when nothing is hovered', () => {
    const result = computeHighlightedIds(null, [{ id: 'a->b', from: 'a', to: 'b' }])
    expect(result.nodeIds.size).toBe(0)
    expect(result.edgeIds.size).toBe(0)
  })

  it('includes the hovered node, its connected neighbors, and connecting edges', () => {
    const edges = [
      { id: 'a->b', from: 'a', to: 'b' },
      { id: 'b->c', from: 'b', to: 'c' },
      { id: 'd->e', from: 'd', to: 'e' },
    ]
    const result = computeHighlightedIds('b', edges)
    expect(result.nodeIds).toEqual(new Set(['b', 'a', 'c']))
    expect(result.edgeIds).toEqual(new Set(['a->b', 'b->c']))
  })

  it('excludes edges and nodes unrelated to the hovered node', () => {
    const edges = [
      { id: 'a->b', from: 'a', to: 'b' },
      { id: 'd->e', from: 'd', to: 'e' },
    ]
    const result = computeHighlightedIds('a', edges)
    expect(result.edgeIds.has('d->e')).toBe(false)
    expect(result.nodeIds.has('d')).toBe(false)
  })

  it('highlights only itself for a node with no edges', () => {
    const result = computeHighlightedIds('z', [{ id: 'a->b', from: 'a', to: 'b' }])
    expect(result.nodeIds).toEqual(new Set(['z']))
    expect(result.edgeIds.size).toBe(0)
  })
})
