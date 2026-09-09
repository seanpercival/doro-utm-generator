import "server-only"
import { createClient } from "@supabase/supabase-js"

/**
 * Server-side Supabase client (route handlers only). Uses the publishable key,
 * which is limited by row-level security to the two doro_utm_* tables.
 */
export function supabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY are not configured")
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export const SAVED_URLS_TABLE = "doro_utm_saved_urls"
export const SETTINGS_TABLE = "doro_utm_settings"
export const TAXONOMY_KEY = "taxonomy"
