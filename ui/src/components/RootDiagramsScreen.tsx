import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchArtifacts, type ArtifactRecord } from '../lib/apiClient'
import { computeRootDiagrams, searchDiagrams, type DiagramSummary } from '../lib/rootDiagrams'

function DiagramList({ repoId, diagrams }: { repoId: string; diagrams: DiagramSummary[] }) {
  return (
    <ul className="repo-list">
      {diagrams.map((d) => (
        <li key={d.id} className="repo-list-item">
          <Link to={`/repos/${encodeURIComponent(repoId)}/diagrams/${encodeURIComponent(d.id)}`}>
            <strong>{d.title}</strong>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-faint)' }}>{d.id}</div>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function RootDiagramsScreen() {
  const { repoId } = useParams<{ repoId: string }>()
  const [artifacts, setArtifacts] = useState<ArtifactRecord[] | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!repoId) return
    fetchArtifacts(repoId, 'diagram').then(setArtifacts)
  }, [repoId])

  if (!artifacts) return null

  const roots = computeRootDiagrams(artifacts)
  const searchResults = searchDiagrams(artifacts, query)

  return (
    <div style={{ padding: 28, maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 22 }}>Diagrams</h1>
      <input
        type="search"
        aria-label="Search diagrams"
        placeholder="Search by id or title…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          width: '100%',
          background: 'var(--surface)',
          color: 'var(--text)',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          padding: '10px 12px',
          fontSize: 14,
          marginBottom: 20,
          boxSizing: 'border-box',
        }}
      />
      {query.trim() ? (
        <DiagramList repoId={repoId!} diagrams={searchResults} />
      ) : (
        <DiagramList repoId={repoId!} diagrams={roots} />
      )}
    </div>
  )
}
