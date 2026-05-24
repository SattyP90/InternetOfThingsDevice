import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from './config.js'

let client

export function getSupabaseClient() {
  if (client) return client

  const { url, anonKey } = getSupabaseConfig()

  if (!url || !anonKey) {
    throw new Error(
      'Supabase is not properly configured. Please check your environment variables.'
    )
  }

  client = createClient(url, anonKey)
  return client
}
