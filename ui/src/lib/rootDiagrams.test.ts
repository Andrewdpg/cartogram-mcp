import { describe, it, expect } from 'vitest'
import { computeRootDiagrams, searchDiagrams } from './rootDiagrams'
import type { ArtifactRecord } from './apiClient'
import type { Diagram } from './types'

function artifact(diagram: Diagram): ArtifactRecord {
  return { id: diagram.id, kind: 'diagram', updatedAt: '2026-01-01T00:00:00.000Z', data: diagram }
}

const deployment: Diagram = {
  id: 'deployment',
  title: 'Deployment',
  nodes: [{ id: 'api', label: 'API', kind: 'system', childDiagram: 'api-internals' }],
  edges: [],
}
const apiInternals: Diagram = {
  id: 'api-internals',
  title: 'API Internals',
  nodes: [{ id: 'handler', label: 'Handler', kind: 'component' }],
  edges: [],
}
const orphanNotes: Diagram = { id: 'notes', title: 'Notes', nodes: [], edges: [] }

describe('computeRootDiagrams', () => {
  it('excludes any diagram referenced as another diagram\'s childDiagram', () => {
    const result = computeRootDiagrams([artifact(deployment), artifact(apiInternals), artifact(orphanNotes)])
    expect(result.map((d) => d.id).sort()).toEqual(['deployment', 'notes'])
  })

  it('sorts results by title', () => {
    const result = computeRootDiagrams([artifact(orphanNotes), artifact(deployment)])
    expect(result.map((d) => d.title)).toEqual(['Deployment', 'Notes'])
  })

  it('returns an empty array for an empty artifact list', () => {
    expect(computeRootDiagrams([])).toEqual([])
  })
})

describe('searchDiagrams', () => {
  const all = [artifact(deployment), artifact(apiInternals), artifact(orphanNotes)]

  it('matches by id substring, case-insensitively', () => {
    // Only 'api-internals' has "api" in its id or title — 'deployment's id/title
    // don't contain that substring.
    const result = searchDiagrams(all, 'API')
    expect(result.map((d) => d.id)).toEqual(['api-internals'])
  })

  it('matches by title substring', () => {
    const result = searchDiagrams(all, 'note')
    expect(result.map((d) => d.id)).toEqual(['notes'])
  })

  it('returns an empty array for a blank query', () => {
    expect(searchDiagrams(all, '   ')).toEqual([])
  })
})
