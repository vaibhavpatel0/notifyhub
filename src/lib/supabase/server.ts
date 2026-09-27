import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { COOKIE_DOMAIN, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";

/**
 * Supabase client bound to the current visitor's session (or anonymous).
 * Every query made with this client is subject to Row Level Security,
 * so it is the default for all reads and admin writes.
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookieOptions: COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : undefined,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: cookies are read-only there.
          // The proxy refreshes the session, so this can be ignored.
        }
      },
    },
  });
}
