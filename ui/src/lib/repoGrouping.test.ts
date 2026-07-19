import { describe, it, expect } from 'vitest'
import { groupRepos, filterGroups } from './repoGrouping'
import type { Registry } from './apiClient'

const registry: Registry = {
  'host/org/a': { path: '/a', name: 'Repo A' },
  'host/org/b': { path: '/b', name: 'Repo B' },
  'host/org/c': { path: '/c', name: 'Repo C' },
}

describe('groupRepos', () => {
  it('keeps connected repos in the same group', () => {
    const groups = groupRepos(registry, [
      ['host/org/a', 'host/org/b'],
      ['host/org/c'],
    ])
    expect(groups).toEqual([{ repoIds: ['host/org/a', 'host/org/b'] }, { repoIds: ['host/org/c'] }])
  })

  it('drops repo ids in a group that are no longer registered', () => {
    const groups = groupRepos(registry, [['host/org/a', 'host/org/stale']])
    expect(groups).toEqual([{ repoIds: ['host/org/a'] }])
  })
})

describe('filterGroups', () => {
  const groups = groupRepos(registry, [
    ['host/org/a', 'host/org/b'],
    ['host/org/c'],
  ])

  it('returns all groups unfiltered for an empty query', () => {
    expect(filterGroups(groups, registry, '')).toEqual(groups)
  })

  it('filters repos by name within a group, dropping groups left empty', () => {
    expect(filterGroups(groups, registry, 'Repo C')).toEqual([{ repoIds: ['host/org/c'] }])
  })

  it('filters by repoId too', () => {
    expect(filterGroups(groups, registry, 'org/a')).toEqual([{ repoIds: ['host/org/a'] }])
  })
})
