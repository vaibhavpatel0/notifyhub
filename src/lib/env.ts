/**
 * Public, non-secret configuration. Safe to import from client components.
 * Secrets live in server-only modules (see lib/supabase/admin.ts, lib/otp.ts).
 */
export const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000").toLowerCase();
// *.vercel.app addresses cannot have per-college subdomains, so they always use /s/<slug> paths.
export const USE_SUBDOMAINS = process.env.NEXT_PUBLIC_USE_SUBDOMAINS !== "false" && !ROOT_DOMAIN.endsWith(".vercel.app");
export const PROTOCOL = process.env.NEXT_PUBLIC_PROTOCOL || (ROOT_DOMAIN.includes("localhost") ? "http" : "https");
export const COOKIE_DOMAIN = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined;
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@notifyhub.in";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
// NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is the name the Supabase <-> Vercel integration uses.
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "public-anon-key";
