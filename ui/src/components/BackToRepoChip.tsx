import { useNavigate } from 'react-router-dom'
import { useBackStack } from '../lib/backStack'

export function BackToRepoChip() {
  const { top, pop } = useBackStack()
  const navigate = useNavigate()

  if (!top) return null

  function handleClick() {
    const { repoId, diagramId, segments } = top!
    const parts = [`/repos/${encodeURIComponent(repoId)}/diagrams/${encodeURIComponent(diagramId)}`, ...segments.map(encodeURIComponent)]
    navigate(parts.join('/'))
    pop()
  }

  return (
    <button
      onClick={handleClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '8px 14px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-float)',
        fontSize: 13,
        color: 'var(--accent-secondary)',
        cursor: 'pointer',
      }}
    >
      ← back to {top.repoId}
    </button>
  )
}
