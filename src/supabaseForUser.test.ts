import { describe, it, expect } from 'vitest'
import { supabaseForUser } from './supabaseForUser'

describe('supabaseForUser', () => {
  it('creates a client with the Authorization header set to the given token', () => {
    const client = supabaseForUser('a-user-jwt')
    // @ts-expect-error accessing internal rest client config for the test
    const headers = client.rest.headers
    expect(headers.Authorization).toBe('Bearer a-user-jwt')
  })
})
