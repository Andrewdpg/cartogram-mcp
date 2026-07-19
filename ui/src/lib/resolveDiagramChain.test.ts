import { describe, it, expect, vi } from 'vitest'
import { resolveDiagramChain, DiagramNotFoundError } from './resolveDiagramChain'
import type { ArtifactRecord } from './apiClient'
import type { Diagram } from './types'

function artifact(diagram: Diagram): ArtifactRecord {
  return { id: diagram.id, kind: 'diagram', updatedAt: '2026-01-01T00:00:00.000Z', data: diagram }
}

const deployment: Diagram = {
  id: 'deployment',
  title: 'Deployment',
  nodes: [
    { id: 'api', label: 'API', kind: 'system', childDiagram: 'api-internals' },
    { id: 'db', label: 'DB', kind: 'database' },
  ],
  edges: [],
}
const apiInternals: Diagram = {
  id: 'api-internals',
  title: 'API Internals',
  nodes: [{ id: 'handler', label: 'Handler', kind: 'component' }],
  edges: [],
}

const records: Record<string, Diagram> = { deployment, 'api-internals': apiInternals }

function makeFetchFn() {
  return vi.fn(async (id: string) => {
    const diagram = records[id]
    return diagram ? artifact(diagram) : null
  })
}

describe('resolveDiagramChain', () => {
  it('returns a one-entry chain for the root diagram with no segments', async () => {
    const chain = await resolveDiagramChain('deployment', [], makeFetchFn())
    expect(chain).toEqual([{ diagram: deployment, updatedAt: '2026-01-01T00:00:00.000Z' }])
  })

  it('walks childDiagram references for each segment', async () => {
    const chain = await resolveDiagramChain('deployment', ['api'], makeFetchFn())
    expect(chain.map((c) => c.diagram.id)).toEqual(['deployment', 'api-internals'])
  })

  it('throws DiagramNotFoundError when the root diagram does not exist', async () => {
    await expect(resolveDiagramChain('missing', [], makeFetchFn())).rejects.toThrow(DiagramNotFoundError)
  })

  it('throws DiagramNotFoundError when a segment node has no childDiagram', async () => {
    await expect(resolveDiagramChain('deployment', ['db'], makeFetchFn())).rejects.toThrow(DiagramNotFoundError)
  })

  it('throws DiagramNotFoundError when a segment node id does not exist on the current diagram', async () => {
    await expect(resolveDiagramChain('deployment', ['nope'], makeFetchFn())).rejects.toThrow(DiagramNotFoundError)
  })
})
