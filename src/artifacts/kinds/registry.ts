import { validateDiagramArtifactData } from './diagram.js'

export const ARTIFACT_KINDS = ['diagram'] as const
export type ArtifactKind = (typeof ARTIFACT_KINDS)[number]

// Adding a new kind later (e.g. "session-note") is: write its own validator
// file next to diagram.ts, add its name to ARTIFACT_KINDS, add one line
// here. Nothing in src/tools/ changes — the four MCP tools only ever call
// validateArtifactData(kind, ...), never a kind-specific function directly.
const VALIDATORS: Record<ArtifactKind, (data: unknown, artifactId: string) => void> = {
  diagram: validateDiagramArtifactData,
}

export class UnknownArtifactKindError extends Error {
  constructor(kind: string) {
    super(`Unknown artifact kind "${kind}". Known kinds: ${ARTIFACT_KINDS.join(', ')}`)
    this.name = 'UnknownArtifactKindError'
  }
}

export function validateArtifactData(kind: string, data: unknown, artifactId: string): void {
  const validator = (VALIDATORS as Record<string, (data: unknown, artifactId: string) => void>)[kind]
  if (!validator) throw new UnknownArtifactKindError(kind)
  validator(data, artifactId)
}
