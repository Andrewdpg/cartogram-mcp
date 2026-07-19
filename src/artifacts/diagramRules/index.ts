import type { DiagramRule, RuleContext } from './types.js'
import { deploymentIsAlwaysRoot } from './deploymentIsAlwaysRoot.js'
import { uniqueDeploymentPerComponent } from './uniqueDeploymentPerComponent.js'

export const DIAGRAM_RULES: DiagramRule[] = [uniqueDeploymentPerComponent, deploymentIsAlwaysRoot]

export function runDiagramRules(ctx: RuleContext): { rule: string; message: string } | null {
  for (const rule of DIAGRAM_RULES) {
    const message = rule.check(ctx)
    if (message) return { rule: rule.name, message }
  }
  return null
}

export { DiagramRuleViolationError } from './types.js'
export type { RuleContext, DiagramRule, RepoGraph } from './types.js'
