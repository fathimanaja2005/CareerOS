import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * The Supabase client for optional sign-in. Without the two public keys the app runs
 * in guest mode and every sign-in control stays hidden. The anon key is public by design:
 * row level security in supabase/schema.sql keeps each person's rows private.
 */
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

export function isAuthConfigured(): boolean {
  return Boolean(URL && KEY);
}

export function getSupabase(): SupabaseClient | null {
  if (!URL || !KEY) return null;
  if (!client) client = createClient(URL, KEY);
  return client;
}
