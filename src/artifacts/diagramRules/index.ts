import type { DiagramRule, RuleContext } from './types.js'
import { deploymentIsAlwaysRoot } from './deploymentIsAlwaysRoot.js'
import { uniqueDeploymentPerComponent } from './uniqueDeploymentPerComponent.js'

// Cheap, purely-local rules first — deploymentIsAlwaysRoot never touches the
// graph, so a violation there rejects before uniqueDeploymentPerComponent
// pays the cost of scanning every registered repo's sqlite index.
export const DIAGRAM_RULES: DiagramRule[] = [deploymentIsAlwaysRoot, uniqueDeploymentPerComponent]

export function runDiagramRules(ctx: RuleContext): { rule: string; message: string } | null {
  for (const rule of DIAGRAM_RULES) {
    const message = rule.check(ctx)
    if (message) return { rule: rule.name, message }
  }
  return null
}

export { DiagramRuleViolationError } from './types.js'
export type { RuleContext, DiagramRule, RepoGraph } from './types.js'
