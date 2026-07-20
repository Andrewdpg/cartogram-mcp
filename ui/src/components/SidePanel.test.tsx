import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SidePanel } from './SidePanel'

const baseProps = {
  node: null,
  notation: 'c4' as const,
  onCloseNode: vi.fn(),
  diagramJson: '{"id":"deployment"}',
  collapsed: false,
  onToggleCollapsed: vi.fn(),
  onTabChange: vi.fn(),
  repoId: 'host/org/repo',
}

describe('SidePanel', () => {
  it('renders exactly three tabs: Details, JSON, Legend', () => {
    render(<SidePanel {...baseProps} activeTab="details" />)
    expect(screen.getByRole('button', { name: 'Details' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'JSON' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Legend' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Share' })).not.toBeInTheDocument()
  })

  it('clicking a tab calls onTabChange with that tab', async () => {
    const onTabChange = vi.fn()
    render(<SidePanel {...baseProps} activeTab="details" onTabChange={onTabChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Legend' }))
    expect(onTabChange).toHaveBeenCalledWith('legend')
  })

  it('the JSON tab shows the diagram JSON as read-only, with no Apply/Reset buttons', () => {
    render(<SidePanel {...baseProps} activeTab="json" />)
    const textarea = screen.getByLabelText('Diagram JSON') as HTMLTextAreaElement
    expect(textarea.value).toBe('{"id":"deployment"}')
    expect(textarea).toHaveAttribute('readonly')
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument()
  })

  it('collapsed renders no tabs', () => {
    render(<SidePanel {...baseProps} activeTab="details" collapsed />)
    expect(screen.queryByRole('button', { name: 'Details' })).not.toBeInTheDocument()
  })
})
