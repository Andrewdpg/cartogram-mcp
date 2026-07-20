import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchRepos, fetchArtifacts, fetchArtifact, fetchRepoGraph, openFile } from './apiClient'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('apiClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetchRepos calls GET /api/repos and returns the parsed body', async () => {
    const body = { local: ['.'], registered: { 'host/org/repo': { path: '/x', name: 'repo' } } }
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(body))

    const result = await fetchRepos()

    expect(fetch).toHaveBeenCalledWith('/api/repos')
    expect(result).toEqual(body)
  })

  it('fetchArtifacts calls GET /api/repos/:repoId/artifacts?kind=... with the repoId URL-encoded', async () => {
    const body = [{ id: 'a', kind: 'diagram', updatedAt: '2026-01-01T00:00:00.000Z', data: { nodes: [], edges: [] } }]
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(body))

    const result = await fetchArtifacts('host/org/repo')

    expect(fetch).toHaveBeenCalledWith('/api/repos/host%2Forg%2Frepo/artifacts?kind=diagram')
    expect(result).toEqual(body)
  })

  it('fetchArtifact calls GET /api/repos/:repoId/artifacts/:id?kind=... and returns the record', async () => {
    const body = { id: 'a', kind: 'diagram', updatedAt: '2026-01-01T00:00:00.000Z', data: { nodes: [], edges: [] } }
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(body))

    const result = await fetchArtifact('host/org/repo', 'a')

    expect(fetch).toHaveBeenCalledWith('/api/repos/host%2Forg%2Frepo/artifacts/a?kind=diagram')
    expect(result).toEqual(body)
  })

  it('fetchArtifact returns null on a 404', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: 'not found' }, 404))

    const result = await fetchArtifact('host/org/repo', 'missing')

    expect(result).toBeNull()
  })

  it('fetchArtifacts throws on a non-2xx, non-404 status', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: 'nope' }, 500))

    await expect(fetchArtifacts('host/org/repo')).rejects.toThrow()
  })

  it('fetchRepoGraph calls GET /api/repo-graph and returns the parsed body', async () => {
    const body = { groups: [['host/org/a', 'host/org/b'], ['host/org/c']] }
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(body))

    const result = await fetchRepoGraph()

    expect(fetch).toHaveBeenCalledWith('/api/repo-graph')
    expect(result).toEqual(body)
  })

  it('openFile POSTs repoId and ref to /api/open-file', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}))

    await openFile('host/org/repo', 'src/foo.ts:42')

    expect(fetch).toHaveBeenCalledWith('/api/open-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoId: 'host/org/repo', ref: 'src/foo.ts:42' }),
    })
  })

  it('openFile accepts a {repo, path} ref for cross-repo sourceRefs', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}))
    const ref = { repo: 'host/org/other', path: 'lib/baz.ts:5' }

    await openFile('host/org/repo', ref)

    expect(fetch).toHaveBeenCalledWith(
      '/api/open-file',
      expect.objectContaining({ body: JSON.stringify({ repoId: 'host/org/repo', ref }) })
    )
  })

  it('openFile throws the server error message on failure', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: 'repoId "x" is not registered' }, 404))

    await expect(openFile('host/org/repo', 'src/foo.ts')).rejects.toThrow('repoId "x" is not registered')
  })
})
