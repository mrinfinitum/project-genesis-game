import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readNoverisSupabaseConfig, type NoverisSupabaseConfig } from "./env";

export type NoverisSupabaseClient = SupabaseClient;

let cachedClient: NoverisSupabaseClient | null = null;
let cachedKey = "";

export function getNoverisSupabaseClient(config: NoverisSupabaseConfig = readNoverisSupabaseConfig()) {
  if (!config.isConfigured) return null;
  const cacheKey = `${config.url}:${config.publishableKey.length}`;
  if (cachedClient && cachedKey === cacheKey) return cachedClient;

  cachedClient = createClient(config.url, config.publishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true
    }
  });
  cachedKey = cacheKey;
  return cachedClient;
}
