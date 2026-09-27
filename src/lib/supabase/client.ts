"use client";
import { createBrowserClient } from "@supabase/ssr";
import { COOKIE_DOMAIN, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

/** Browser client: used for realtime subscriptions and direct-to-storage uploads (RLS enforced). */
export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookieOptions: COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : undefined,
    });
  }
  return browserClient;
}
