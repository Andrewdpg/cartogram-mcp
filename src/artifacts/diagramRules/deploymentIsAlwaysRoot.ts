import type { DiagramRule } from './types.js'

interface NodeLike {
  childDiagram?: unknown
  externalRef?: { artifactId?: unknown }
}
interface DataLike {
  nodes?: NodeLike[]
}

export const deploymentIsAlwaysRoot: DiagramRule = {
  name: 'deploymentIsAlwaysRoot',
  check(ctx) {
    const nodes = (ctx.data as DataLike)?.nodes ?? []
    for (const node of nodes) {
      if (node.childDiagram === 'deployment') {
        return 'a node set childDiagram to "deployment" — deployment diagrams are always a root, never a child'
      }
      if (node.externalRef?.artifactId === 'deployment') {
        return 'a node set externalRef.artifactId to "deployment" — deployment diagrams are always a root, never a child'
      }
    }
    return null
  },
}
