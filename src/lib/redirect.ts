import { ROOT_DOMAIN } from "@/lib/env";

/**
 * Where auth links may send people after sign-in: same-site paths, or an
 * absolute URL on the platform domain or one of its college subdomains.
 * Anything else falls back, so links can never be used as open redirects.
 */
export function safeRedirectTarget(next: string | null, requestUrl: string, fallback = "/login"): URL {
  const base = new URL(requestUrl);
  if (!next) return new URL(fallback, base);
  if (next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")) return new URL(next, base);
  try {
    const url = new URL(next);
    const root = ROOT_DOMAIN.split(":")[0];
    const host = url.hostname;
    if ((url.protocol === "https:" || url.protocol === "http:") && (host === root || host.endsWith(`.${root}`) || host === base.hostname)) {
      return url;
    }
  } catch {
    /* fall through */
  }
  return new URL(fallback, base);
}
