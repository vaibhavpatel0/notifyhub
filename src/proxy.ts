import { NextResponse, type NextRequest } from "next/server";
import { refreshSession } from "@/lib/supabase/proxy";
import { INTERNAL_TENANT_PREFIX, resolveHost } from "@/lib/tenant";
import { PROTOCOL, ROOT_DOMAIN, USE_SUBDOMAINS } from "@/lib/env";

/**
 * Tenant resolution.
 *
 *   vits.notifyhub.in/announcements  -- rewrite -->  /s/vits/announcements
 *   notifyhub.in/s/vits/events       -- redirect -> vits.notifyhub.in/events (subdomain mode)
 *
 * The rewrite is internal: the browser keeps the subdomain URL. The page
 * then loads the college by slug; every query is still filtered by
 * college_id and protected by Row Level Security in the database.
 */
const SHARED_PREFIXES = ["/api/", "/auth/", "/_next/"];

export async function proxy(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const resolution = resolveHost(host);
  const { pathname, search } = request.nextUrl;

  if (resolution.kind === "tenant") {
    if (SHARED_PREFIXES.some((p) => pathname.startsWith(p))) {
      return refreshSession(request, () => NextResponse.next({ request }));
    }
    const target = new URL(
      `${INTERNAL_TENANT_PREFIX}/${resolution.slug}${pathname === "/" ? "" : pathname}${search}`,
      request.url,
    );
    const headers = new Headers(request.headers);
    headers.set("x-notifyhub-tenant", resolution.slug);
    return refreshSession(request, () => NextResponse.rewrite(target, { request: { headers } }));
  }

  // Platform host. In subdomain mode, send path-style portal URLs to their subdomain,
  // but only on the real root domain (preview deployments keep path mode).
  const hostNoPort = (host ?? "").split(":")[0];
  const onRootDomain = hostNoPort === ROOT_DOMAIN.split(":")[0] || hostNoPort === `www.${ROOT_DOMAIN.split(":")[0]}`;
  const match = pathname.match(/^\/s\/([a-z0-9-]+)(\/.*)?$/);
  if (USE_SUBDOMAINS && onRootDomain && match) {
    const [, slug, rest = ""] = match;
    return NextResponse.redirect(`${PROTOCOL}://${slug}.${ROOT_DOMAIN}${rest}${search}`, 308);
  }

  return refreshSession(request, () => NextResponse.next({ request }));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|.*\\.(?:png|jpg|jpeg|svg|webp|ico|woff2?)$).*)"],
};
