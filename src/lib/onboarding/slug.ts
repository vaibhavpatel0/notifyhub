import { RESERVED_SLUGS, isValidSlugShape } from "@/lib/tenant";
import { registrableDomain } from "./domain";

const STOP = new Set(["of", "and", "the", "for", "&", "in", "at", "a", "an"]);

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

function words(name: string) {
  return name
    .replace(/\(.*?\)/g, " ")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
}

export function acronym(name: string): string {
  return words(name)
    .filter((w) => !STOP.has(w.toLowerCase()))
    .map((w) => w[0]!.toLowerCase())
    .join("");
}

/**
 * Ordered subdomain suggestions for a college, most natural first.
 *   "Vignan Institute of Technology and Science" -> vits, vignanits, vits-college, vignan-tech, ...
 */
export function slugCandidates(name: string, opts: { shortName?: string | null; websiteUrl?: string | null } = {}): string[] {
  const list: string[] = [];
  const ws = words(name).filter((w) => !STOP.has(w.toLowerCase()));
  const acr = acronym(name);
  const first = ws[0]?.toLowerCase() ?? "";

  if (opts.shortName) list.push(slugify(opts.shortName));
  if (acr.length >= 2) list.push(acr);
  if (ws.length > 1 && acr.length >= 2) list.push(`${first}${acr.slice(1)}`);
  if (opts.websiteUrl) {
    const domain = registrableDomain(opts.websiteUrl);
    if (domain) list.push(slugify(domain.split(".")[0]!));
  }
  if (acr.length >= 2) list.push(`${acr}-college`);
  if (/technolog/i.test(name) && first) list.push(`${first}-tech`);
  if (ws.length >= 2) list.push(slugify(`${ws[0]} ${ws[1]}`));
  if (first) list.push(slugify(first));
  list.push(slugify(name));

  const seen = new Set<string>();
  return list.filter((s) => {
    if (!s || seen.has(s) || !isValidSlugShape(s) || RESERVED_SLUGS.has(s)) return false;
    seen.add(s);
    return true;
  });
}

export function isAllowedSlug(slug: string) {
  return isValidSlugShape(slug) && !RESERVED_SLUGS.has(slug);
}
