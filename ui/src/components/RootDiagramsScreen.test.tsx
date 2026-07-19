import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { RootDiagramsScreen } from './RootDiagramsScreen'
import * as apiClient from '../lib/apiClient'
import type { ArtifactRecord } from '../lib/apiClient'
import type { Diagram } from '../lib/types'

function artifact(diagram: Diagram): ArtifactRecord {
  return { id: diagram.id, kind: 'diagram', updatedAt: '2026-01-01T00:00:00.000Z', data: diagram }
}

const deployment: Diagram = {
  id: 'deployment',
  title: 'Deployment',
  nodes: [{ id: 'api', label: 'API', kind: 'system', childDiagram: 'api-internals' }],
  edges: [],
}
const apiInternals: Diagram = { id: 'api-internals', title: 'API Internals', nodes: [], edges: [] }

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={['/repos/host%2Forg%2Frepo']}>
      <Routes>
        <Route path="/repos/:repoId" element={<RootDiagramsScreen />} />
        <Route path="/repos/:repoId/diagrams/:diagramId" element={<div>diagram screen</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('RootDiagramsScreen', () => {
  beforeEach(() => {
    vi.spyOn(apiClient, 'fetchArtifacts').mockResolvedValue([artifact(deployment), artifact(apiInternals)])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches artifacts for the repoId from the URL and lists root diagrams', async () => {
    renderScreen()
    await screen.findByRole('link', { name: /Deployment/i })
    expect(apiClient.fetchArtifacts).toHaveBeenCalledWith('host/org/repo', 'diagram')
    // api-internals is referenced by deployment's childDiagram — not a root, so not listed.
    expect(screen.queryByRole('link', { name: /API Internals/i })).not.toBeInTheDocument()
  })

  it('root diagram links navigate to /repos/:repoId/diagrams/:diagramId', async () => {
    renderScreen()
    const link = await screen.findByRole('link', { name: /Deployment/i })
    expect(link).toHaveAttribute('href', '/repos/host%2Forg%2Frepo/diagrams/deployment')
  })

  it('typing in the search box filters across ALL diagrams, including non-roots', async () => {
    renderScreen()
    await screen.findByRole('link', { name: /Deployment/i })
    await userEvent.type(screen.getByRole('searchbox', { name: /search/i }), 'internals')
    await waitFor(() => expect(screen.getByRole('link', { name: /API Internals/i })).toBeInTheDocument())
  })
})
