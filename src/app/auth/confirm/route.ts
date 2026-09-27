import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectTarget } from "@/lib/redirect";

/**
 * Handles links from Supabase auth emails (confirm signup, reset password, invite).
 * Works with both the custom-template style (?token_hash=&type=) and the
 * default-template PKCE style (?code=).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const target = safeRedirectTarget(searchParams.get("next"), request.url);

  const supabase = await createClient();
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(target);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(target);
  } else if (searchParams.get("next")) {
    // Implicit-flow links carry the session in the URL fragment, which only the browser can read.
    return NextResponse.redirect(target);
  }
  return NextResponse.redirect(new URL("/login?error=link_expired", request.url));
}
