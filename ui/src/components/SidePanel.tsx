import type { DiagramNodeData, Notation } from '../lib/types'
import { DiagramDetailPanel } from './DiagramDetailPanel'
import { LegendTab } from './LegendTab'

export type Tab = 'details' | 'json' | 'legend'

export interface SidePanelProps {
  node: DiagramNodeData | null
  notation: Notation
  onCloseNode: () => void
  diagramJson: string
  collapsed: boolean
  onToggleCollapsed: () => void
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  repoId: string
}

const TAB_LABELS: Record<Tab, string> = {
  details: 'Details',
  json: 'JSON',
  legend: 'Legend',
}

export function SidePanel({
  node,
  notation,
  onCloseNode,
  diagramJson,
  collapsed,
  onToggleCollapsed,
  activeTab,
  onTabChange,
  repoId,
}: SidePanelProps) {
  return (
    <aside className="side-panel" style={{ width: collapsed ? 52 : 360, flexShrink: 0 }}>
      <div className="side-panel-header">
        <button
          className="icon-btn side-panel-toggle"
          aria-label={collapsed ? 'Show side panel' : 'Hide side panel'}
          onClick={onToggleCollapsed}
        >
          <span
            style={{
              display: 'inline-block',
              transition: 'transform var(--transition-slow)',
              transform: collapsed ? 'rotate(180deg)' : 'none',
            }}
          >
            ▶
          </span>
        </button>
        {!collapsed && (
          <div className="side-panel-tabs">
            {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
              <button
                key={t}
                className={`side-panel-tab${activeTab === t ? ' active' : ''}`}
                onClick={() => onTabChange(t)}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>
        )}
      </div>
      {!collapsed && (
        <div className="side-panel-body">
          {activeTab === 'details' && (
            <DiagramDetailPanel node={node} notation={notation} onClose={onCloseNode} repoId={repoId} />
          )}
          {activeTab === 'json' && (
            <textarea
              className="json-editor"
              value={diagramJson}
              readOnly
              spellCheck={false}
              aria-label="Diagram JSON"
            />
          )}
          {activeTab === 'legend' && <LegendTab />}
        </div>
      )}
    </aside>
  )
}
