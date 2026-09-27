import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/env";

/**
 * Service-role client. Bypasses Row Level Security.
 * Only use for operations that have no signed-in user yet (onboarding,
 * OTP storage) or that need the Auth admin API (creating admin users),
 * and always after the caller has been authorised in application code.
 */
export function createAdminClient() {
  // SUPABASE_SECRET_KEY is the name the Supabase <-> Vercel integration uses.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
