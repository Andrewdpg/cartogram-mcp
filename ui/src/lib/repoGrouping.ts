import type { Registry } from './apiClient'

export interface RepoGroup {
  repoIds: string[]
}

// `groups` comes straight from GET /api/repo-graph (src/uiServer.ts), which
// already resolves connectivity server-side — this just filters out any
// repoId the client's own /api/repos response no longer has (a narrow
// race between the two requests), so it never renders a group entry with
// no matching registry data.
export function groupRepos(registry: Registry, groups: string[][]): RepoGroup[] {
  return groups
    .map((group) => ({ repoIds: group.filter((id) => id in registry) }))
    .filter((group) => group.repoIds.length > 0)
}

export function filterGroups(groups: RepoGroup[], registry: Registry, query: string): RepoGroup[] {
  const q = query.trim().toLowerCase()
  if (!q) return groups
  return groups
    .map((group) => ({
      repoIds: group.repoIds.filter((id) => {
        const name = registry[id]?.name ?? ''
        return id.toLowerCase().includes(q) || name.toLowerCase().includes(q)
      }),
    }))
    .filter((group) => group.repoIds.length > 0)
}
