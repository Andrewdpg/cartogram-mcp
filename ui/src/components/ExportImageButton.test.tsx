import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReactFlowProvider } from '@xyflow/react'
import * as htmlToImage from 'html-to-image'
import { ExportImageButton } from './ExportImageButton'

vi.mock('html-to-image', () => ({ toPng: vi.fn().mockResolvedValue('data:image/png;base64,fake') }))

afterEach(() => {
  vi.clearAllMocks()
})

function renderButton() {
  return render(
    <ReactFlowProvider>
      <div className="react-flow__viewport">
        <ExportImageButton />
      </div>
    </ReactFlowProvider>
  )
}

describe('ExportImageButton', () => {
  it('renders a button labeled to export the diagram', () => {
    renderButton()
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument()
  })

  it('calls html-to-image toPng when clicked', async () => {
    renderButton()
    await userEvent.click(screen.getByRole('button', { name: /export/i }))
    expect(htmlToImage.toPng).toHaveBeenCalled()
  })
})
