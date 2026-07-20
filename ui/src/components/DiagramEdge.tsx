import type { CSSProperties } from 'react'
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type Position } from '@xyflow/react'

// ponytail: typed against exactly the props this component reads, not
// @xyflow/react's EdgeProps<Edge> generic — same reasoning as DiagramNode.tsx:
// React Flow calls edge components with more props at runtime (selected,
// source, target, ...) than we declare or use, and pinning to the library's
// own generic type couples this file to a shape that has changed across
// major versions.
export interface DiagramEdgeProps {
  id: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  sourcePosition: Position
  targetPosition: Position
  style?: CSSProperties
  markerEnd?: string
  label?: string
}

export function DiagramEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  label,
}: DiagramEdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  })

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      {label && (
        <EdgeLabelRenderer>
          <div
            className="badge"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'none',
              opacity: style?.opacity,
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
