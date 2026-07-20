import { describe, it, expect } from 'vitest'
import { NODE_KINDS } from './types'
import { getNodeKindIcon } from './nodeKindIcons'

describe('getNodeKindIcon', () => {
  it('returns a distinct icon component for every node kind', () => {
    const icons = NODE_KINDS.map(getNodeKindIcon)
    expect(new Set(icons).size).toBe(NODE_KINDS.length)
  })

  it.each(NODE_KINDS)('returns a function (component) for kind "%s"', (kind) => {
    expect(typeof getNodeKindIcon(kind)).toBe('object')
  })
})
