import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let supabaseAdminClient: SupabaseClient | null = null

function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

export function getSupabaseAdminClient(): SupabaseClient {
  if (!supabaseAdminClient) {
    supabaseAdminClient = createClient(
      getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
      getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  }

  return supabaseAdminClient
}
