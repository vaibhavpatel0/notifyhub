import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectTarget } from "@/lib/redirect";

/** PKCE code exchange for auth redirects (email confirmation after sign-up). */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const target = safeRedirectTarget(request.nextUrl.searchParams.get("next"), request.url);
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(target);
  }
  return NextResponse.redirect(new URL("/login?error=link_expired", request.url));
}
