import { describe, it, expect } from 'vitest'
import { DIAGRAM_RULES, runDiagramRules } from './index.js'
import type { RuleContext, RepoGraph } from './types.js'

const dummyGraph: RepoGraph = { componentOf: () => new Set(), deploymentOwner: () => null }

function ctx(overrides: Partial<RuleContext>): RuleContext {
  return {
    kind: 'diagram',
    id: 'some-diagram',
    data: { nodes: [], edges: [] },
    repoId: 'host/org/a',
    graph: () => dummyGraph,
    ...overrides,
  }
}

describe('DIAGRAM_RULES', () => {
  it('includes both rules by name', () => {
    expect(DIAGRAM_RULES.map((r) => r.name).sort()).toEqual(['deploymentIsAlwaysRoot', 'uniqueDeploymentPerComponent'])
  })
})

describe('runDiagramRules', () => {
  it('returns null when no rule objects', () => {
    const data = { nodes: [{ id: 'a', label: 'A', kind: 'service', childDiagram: 'auth-internals' }], edges: [] }
    expect(runDiagramRules(ctx({ data }))).toBeNull()
  })

  it('returns the first violating rule name and message', () => {
    const data = { nodes: [{ id: 'a', label: 'A', kind: 'service', childDiagram: 'deployment' }], edges: [] }
    const result = runDiagramRules(ctx({ data }))
    expect(result).toEqual({ rule: 'deploymentIsAlwaysRoot', message: expect.stringMatching(/childDiagram/) })
  })
})
