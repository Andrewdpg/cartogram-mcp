import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect, type ReactNode } from 'react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { BackToRepoChip } from './BackToRepoChip'
import { BackStackProvider, useBackStack } from '../lib/backStack'

function Seeded({ children }: { children: ReactNode }) {
  const { push } = useBackStack()
  useEffect(() => {
    push({ repoId: 'host/org/a', diagramId: 'root', segments: ['x'] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return <>{children}</>
}

function renderChip(seed: boolean) {
  return render(
    <MemoryRouter initialEntries={['/repos/host%2Forg%2Fb/diagrams/root']}>
      <BackStackProvider>
        {seed ? (
          <Seeded>
            <Routes>
              <Route path="*" element={<BackToRepoChip />} />
            </Routes>
          </Seeded>
        ) : (
          <Routes>
            <Route path="*" element={<BackToRepoChip />} />
          </Routes>
        )}
      </BackStackProvider>
    </MemoryRouter>
  )
}

describe('BackToRepoChip', () => {
  it('renders nothing when the back stack is empty', () => {
    renderChip(false)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it("shows the top entry's repoId once something has been pushed", async () => {
    renderChip(true)
    expect(await screen.findByRole('button', { name: /host\/org\/a/ })).toBeInTheDocument()
  })

  it('clicking navigates to the stored location and pops the entry', async () => {
    render(
      <MemoryRouter initialEntries={['/repos/host%2Forg%2Fb/diagrams/root']}>
        <BackStackProvider>
          <Seeded>
            <Routes>
              <Route path="*" element={<BackToRepoChip />} />
              <Route path="/repos/host%2Forg%2Fa/diagrams/root/x" element={<div>Landed</div>} />
            </Routes>
          </Seeded>
        </BackStackProvider>
      </MemoryRouter>
    )
    const button = await screen.findByRole('button', { name: /host\/org\/a/ })
    await userEvent.click(button)
    expect(screen.queryByRole('button')).toBeNull()
    expect(await screen.findByText('Landed')).toBeInTheDocument()
  })
})
