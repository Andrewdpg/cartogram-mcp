import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchRepos, type ReposResponse } from '../lib/apiClient'

export function RepoPicker() {
  const [repos, setRepos] = useState<ReposResponse | null>(null)

  useEffect(() => {
    fetchRepos().then(setRepos)
  }, [])

  if (!repos) return null

  const registeredEntries = Object.entries(repos.registered)

  return (
    <div style={{ padding: 28, maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 22 }}>Repositories</h1>
      {registeredEntries.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          No repos registered yet — run <code>waycairn init</code> inside a repo to register it.
        </p>
      ) : (
        <ul className="repo-list">
          {registeredEntries.map(([repoId, entry]) => (
            <li key={repoId} className="repo-list-item">
              <Link to={`/repos/${encodeURIComponent(repoId)}`}>
                <strong>{entry.name}</strong>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-faint)' }}>
                  {repoId}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {repos.local.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Not registered</h2>
          <p style={{ fontSize: 12, color: 'var(--text-faint)' }}>
            Found a <code>.git</code> here, but not yet browsable — run <code>waycairn init</code> in these to add them.
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {repos.local.map((path) => (
              <li key={path} style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-faint)' }}>
                {path}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
