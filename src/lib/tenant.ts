import { PROTOCOL, ROOT_DOMAIN, USE_SUBDOMAINS } from "./env";

/**
 * Subdomains that can never become a college slug. Keeps platform
 * infrastructure names and confusing words out of the tenant namespace.
 */
export const RESERVED_SLUGS = new Set([
  "www", "admin", "api", "app", "auth", "mail", "email", "smtp", "ftp", "cdn", "static", "assets",
  "status", "docs", "help", "support", "blog", "dev", "staging", "test", "demo-admin", "super-admin",
  "login", "logout", "signup", "register", "dashboard", "billing", "notifyhub", "root", "s", "portal",
  "security", "legal", "privacy", "terms", "about", "contact", "connect", "onboarding",
]);

export const INTERNAL_TENANT_PREFIX = "/s";

export type HostResolution =
  | { kind: "platform" }
  | { kind: "tenant"; slug: string };

/**
 * Work out which tenant (if any) a request host belongs to.
 *   notifyhub.in            -> platform
 *   www.notifyhub.in        -> platform
 *   vits.notifyhub.in       -> tenant "vits"
 *   vits.localhost:3000     -> tenant "vits"   (root "localhost:3000")
 *   a.b.notifyhub.in        -> platform (nested subdomains are not tenants)
 *   anything-else.vercel.app -> platform (path mode: /s/<slug>)
 */
export function resolveHost(rawHost: string | null | undefined, rootDomain: string = ROOT_DOMAIN): HostResolution {
  if (!rawHost) return { kind: "platform" };
  const host = rawHost.toLowerCase().trim();
  const root = rootDomain.toLowerCase();

  const hostNoPort = host.split(":")[0];
  const rootNoPort = root.split(":")[0];

  if (hostNoPort === rootNoPort) return { kind: "platform" };
  if (!hostNoPort.endsWith(`.${rootNoPort}`)) return { kind: "platform" };

  const sub = hostNoPort.slice(0, -(rootNoPort.length + 1));
  if (!sub || sub.includes(".") || sub === "www") return { kind: "platform" };
  if (!isValidSlugShape(sub)) return { kind: "platform" };
  return { kind: "tenant", slug: sub };
}

/** lowercase letters, digits and single hyphens; 2 to 40 chars; no leading/trailing hyphen */
export function isValidSlugShape(slug: string): boolean {
  return /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){1,39}$/.test(slug);
}

/**
 * Path to a page inside a college portal, suitable for <Link href>.
 * In subdomain mode the portal is served from the subdomain root, so
 * links are relative to it; in path mode they carry the /s/<slug> prefix.
 */
export function portalPath(slug: string, path = "/"): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (USE_SUBDOMAINS) return clean;
  return `${INTERNAL_TENANT_PREFIX}/${slug}${clean === "/" ? "" : clean}`;
}

/** Absolute URL of a portal page. Use for links that cross hosts (platform -> portal, emails). */
export function portalUrl(slug: string, path = "/"): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (USE_SUBDOMAINS) return `${PROTOCOL}://${slug}.${ROOT_DOMAIN}${clean === "/" ? "" : clean}`;
  return `${PROTOCOL}://${ROOT_DOMAIN}${INTERNAL_TENANT_PREFIX}/${slug}${clean === "/" ? "" : clean}`;
}

/** Human-readable portal address, e.g. "vits.notifyhub.in" */
export function portalHost(slug: string): string {
  return USE_SUBDOMAINS ? `${slug}.${ROOT_DOMAIN}` : `${ROOT_DOMAIN}/s/${slug}`;
}

/** Absolute URL on the platform (root) domain. */
export function platformUrl(path = "/"): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${PROTOCOL}://${ROOT_DOMAIN}${clean === "/" ? "" : clean}`;
}
