export interface RepoGraph {
  componentOf(repoId: string): Set<string>
  deploymentOwner(repoId: string): string | null
}

export interface RuleContext {
  kind: string
  id: string
  data: unknown
  repoId: string | null
  graph(): RepoGraph
}

export interface DiagramRule {
  name: string
  check(ctx: RuleContext): string | null
}

export class DiagramRuleViolationError extends Error {
  constructor(rule: string, message: string) {
    super(`Diagram rule "${rule}" violated: ${message}`)
    this.name = 'DiagramRuleViolationError'
  }
}
