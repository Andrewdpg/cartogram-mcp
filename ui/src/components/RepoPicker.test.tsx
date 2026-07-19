import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { RepoPicker } from './RepoPicker'
import * as apiClient from '../lib/apiClient'

describe('RepoPicker', () => {
  beforeEach(() => {
    vi.spyOn(apiClient, 'fetchRepos').mockResolvedValue({
      local: ['unregistered-repo'],
      registered: { 'host/org/repo': { path: '/somewhere/repo', name: 'repo' } },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders registered repos as links to /repos/:repoId', async () => {
    render(
      <MemoryRouter>
        <RepoPicker />
      </MemoryRouter>
    )
    const link = await screen.findByRole('link', { name: /repo/i })
    expect(link).toHaveAttribute('href', '/repos/host%2Forg%2Frepo')
  })

  it('renders local (unregistered) repos as plain, non-link text under a "Not registered" heading', async () => {
    render(
      <MemoryRouter>
        <RepoPicker />
      </MemoryRouter>
    )
    await waitFor(() => expect(screen.getByText('unregistered-repo')).toBeInTheDocument())
    expect(screen.getByText('unregistered-repo').closest('a')).toBeNull()
    expect(screen.getByText(/not registered/i)).toBeInTheDocument()
  })

  it('renders an error message instead of staying blank when fetchRepos rejects', async () => {
    vi.spyOn(apiClient, 'fetchRepos').mockRejectedValue(new Error('network error'))
    render(
      <MemoryRouter>
        <RepoPicker />
      </MemoryRouter>
    )
    expect(await screen.findByText(/failed to load repositories/i)).toBeInTheDocument()
  })
})
