import { Download } from 'lucide-react'
import { getNodesBounds, getViewportForBounds, useReactFlow } from '@xyflow/react'
import { toPng } from 'html-to-image'

const EXPORT_PADDING = 0.1
const EXPORT_MIN_ZOOM = 0.5
const EXPORT_MAX_ZOOM = 2

export function ExportImageButton() {
  const { getNodes } = useReactFlow()

  async function handleExport() {
    const viewportEl = document.querySelector<HTMLElement>('.react-flow__viewport')
    if (!viewportEl) return

    const nodes = getNodes()
    const bounds = getNodesBounds(nodes)
    const { x, y, zoom } = getViewportForBounds(bounds, viewportEl.clientWidth, viewportEl.clientHeight, EXPORT_MIN_ZOOM, EXPORT_MAX_ZOOM, EXPORT_PADDING)

    const dataUrl = await toPng(viewportEl, {
      backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#0c0d10',
      width: viewportEl.clientWidth,
      height: viewportEl.clientHeight,
      style: {
        width: `${viewportEl.clientWidth}px`,
        height: `${viewportEl.clientHeight}px`,
        transform: `translate(${x}px, ${y}px) scale(${zoom})`,
      },
    })

    const link = document.createElement('a')
    link.download = 'diagram.png'
    link.href = dataUrl
    link.click()
  }

  return (
    <button
      className="btn"
      aria-label="Export diagram as PNG"
      onClick={handleExport}
      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
    >
      <Download size={14} />
      Export
    </button>
  )
}
