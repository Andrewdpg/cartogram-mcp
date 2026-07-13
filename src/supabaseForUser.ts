import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const anonKey = process.env.SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables')
}

export function supabaseForUser(accessToken: string): SupabaseClient {
  const client = createClient(url!, anonKey!, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Wrap rest.headers to support direct property access
  const originalHeaders = client.rest.headers
  const headersProxy = new Proxy(originalHeaders, {
    get(target, prop) {
      if (typeof prop === 'string' && prop[0] === prop[0].toUpperCase()) {
        return target.get(prop.toLowerCase())
      }
      return Reflect.get(target, prop)
    },
  })

  // Replace the headers object with our proxy
  Object.defineProperty(client.rest, 'headers', {
    value: headersProxy,
    writable: false,
    configurable: false,
  })

  return client
}
