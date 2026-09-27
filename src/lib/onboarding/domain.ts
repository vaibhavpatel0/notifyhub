import { getDomain } from "tldts";

/** Consumer mailbox providers. Addresses here never prove control of a college. */
const FREE_MAIL = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.in", "yahoo.in", "outlook.com", "hotmail.com", "live.com",
  "msn.com", "icloud.com", "me.com", "aol.com", "rediffmail.com", "protonmail.com", "proton.me", "zoho.com",
  "yandex.com", "mail.com", "gmx.com",
]);

export function normaliseWebsiteUrl(input: string): URL | null {
  let raw = input.trim();
  if (!raw) return null;
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    if (url.port && url.port !== "80" && url.port !== "443") return null;
    if (!url.hostname.includes(".")) return null;
    if (/^\d+\.\d+\.\d+\.\d+$/.test(url.hostname) || url.hostname.startsWith("[")) return null; // IP literals
    url.hash = "";
    url.search = "";
    // People often paste an inner page ("…/about.html", "…/index.php"). Use the folder it sits in,
    // which for almost every college site is the home page.
    if (/\.[a-z0-9]{2,5}$/i.test(url.pathname)) url.pathname = url.pathname.replace(/[^/]*$/, "");
    return url;
  } catch {
    return null;
  }
}

/** Registrable domain: www.cs.examplecollege.ac.in -> examplecollege.ac.in */
export function registrableDomain(hostOrUrl: string): string | null {
  const host = hostOrUrl.includes("://") ? new URL(hostOrUrl).hostname : hostOrUrl;
  return getDomain(host.toLowerCase(), { allowPrivateDomains: true }) ?? null;
}

export function emailDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 1) return null;
  return email.slice(at + 1).toLowerCase().trim() || null;
}

export function isFreeMail(email: string) {
  const d = emailDomain(email);
  return d ? FREE_MAIL.has(d) : false;
}

/**
 * True when the address belongs to the college's own domain (or a subdomain
 * of it), e.g. principal@examplecollege.ac.in or hod@cse.examplecollege.ac.in
 * for the website www.examplecollege.ac.in.
 */
export function emailMatchesDomain(email: string, websiteDomain: string): boolean {
  const d = emailDomain(email);
  if (!d || isFreeMail(email)) return false;
  const site = websiteDomain.toLowerCase();
  return d === site || d.endsWith(`.${site}`);
}

export const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i;

/** Order detected addresses so the most likely official mailbox comes first. */
export function rankOfficialEmails(emails: string[], websiteDomain: string): string[] {
  const preferred = ["principal", "director", "admin", "registrar", "office", "info", "contact", "admissions", "enquiry", "enquiries"];
  return emails
    .filter((e) => emailMatchesDomain(e, websiteDomain))
    .sort((a, b) => score(a) - score(b) || a.localeCompare(b));
  function score(e: string) {
    const local = e.split("@")[0]!.toLowerCase();
    const i = preferred.findIndex((p) => local === p || local.startsWith(p));
    return i === -1 ? preferred.length : i;
  }
}
