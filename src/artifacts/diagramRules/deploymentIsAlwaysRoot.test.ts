import { describe, it, expect } from 'vitest'
import { deploymentIsAlwaysRoot } from './deploymentIsAlwaysRoot.js'
import type { RuleContext, RepoGraph } from './types.js'

const dummyGraph: RepoGraph = {
  componentOf: () => new Set(),
  deploymentOwner: () => null,
}

function ctx(overrides: Partial<RuleContext>): RuleContext {
  return {
    kind: 'diagram',
    id: 'some-diagram',
    data: { nodes: [], edges: [] },
    repoId: 'host/org/repo',
    graph: () => dummyGraph,
    ...overrides,
  }
}

describe('deploymentIsAlwaysRoot', () => {
  it('rejects a node with childDiagram set to "deployment"', () => {
    const data = { nodes: [{ id: 'a', label: 'A', kind: 'service', childDiagram: 'deployment' }], edges: [] }
    expect(deploymentIsAlwaysRoot.check(ctx({ data }))).toMatch(/childDiagram.*deployment/)
  })

  it('rejects a node whose externalRef.artifactId is "deployment"', () => {
    const data = {
      nodes: [{ id: 'a', label: 'A', kind: 'external', externalRef: { repo: 'host/org/other', artifactId: 'deployment' } }],
      edges: [],
    }
    expect(deploymentIsAlwaysRoot.check(ctx({ data }))).toMatch(/externalRef.*deployment/)
  })

  it('allows a node with an unrelated childDiagram', () => {
    const data = { nodes: [{ id: 'a', label: 'A', kind: 'service', childDiagram: 'auth-internals' }], edges: [] }
    expect(deploymentIsAlwaysRoot.check(ctx({ data }))).toBeNull()
  })

  it('allows a node with an unrelated externalRef', () => {
    const data = {
      nodes: [{ id: 'a', label: 'A', kind: 'external', externalRef: { repo: 'host/org/other', artifactId: 'components' } }],
      edges: [],
    }
    expect(deploymentIsAlwaysRoot.check(ctx({ data }))).toBeNull()
  })

  it('allows writing the deployment diagram itself (its own nodes point at other repos, not at "deployment")', () => {
    const data = {
      nodes: [{ id: 'svc', label: 'Svc', kind: 'external', externalRef: { repo: 'host/org/other', artifactId: 'components' } }],
      edges: [],
    }
    expect(deploymentIsAlwaysRoot.check(ctx({ id: 'deployment', data }))).toBeNull()
  })
})
