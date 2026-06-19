"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";
import type { Database } from "./types";

let _client: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Get the Supabase browser client. Created lazily to avoid build issues
 * when Supabase env vars are not yet configured.
 * Returns null if Supabase is not configured.
 */
export function getSupabaseBrowserClient() {
  if (!env.isSupabaseConfigured) {
    if (typeof window !== "undefined") {
      console.warn(
        "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
      );
    }
    return null as unknown as ReturnType<typeof createBrowserClient<Database>>;
  }

  if (!_client) {
    _client = createBrowserClient<Database>(
      env.SUPABASE_URL,
      env.SUPABASE_ANON_KEY
    );
  }
  return _client;
}

/**
 * Supabase browser client singleton.
 * IMPORTANT: Only use this in Client Components ("use client").
 * Import from this module at the top of your file — it only creates the
 * client when first accessed, so build/prerender won't fail.
 */
export const supabase = getSupabaseBrowserClient();
