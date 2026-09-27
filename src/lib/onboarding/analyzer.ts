import "server-only";
import { extractFromHtml, pickFollowUpPages, type ExtractedInfo } from "./extract";
import { isPathAllowed } from "./robots";
import { rankOfficialEmails, registrableDomain } from "./domain";
import { FetchBlockedError, safeFetch } from "./safe-fetch";

export type StepKey = "reachable" | "robots" | "name" | "logo" | "contact" | "email" | "departments";
export type StepStatus = "ok" | "warn" | "fail";

export const STEP_LABELS: Record<StepKey, string> = {
  reachable: "Website reachable",
  robots: "Public pages open to crawling",
  name: "College name detected",
  logo: "Logo detected",
  contact: "Contact information detected",
  email: "Public email detected",
  departments: "Departments detected",
};

export type AnalysisEvent =
  | { type: "page"; url: string }
  | { type: "step"; key: StepKey; status: StepStatus; detail?: string };

export interface AnalysisResult {
  status: "completed" | "failed" | "blocked";
  websiteUrl: string;
  finalUrl: string | null;
  domain: string | null;
  name: string | null;
  description: string | null;
  logo: string | null;
  address: string | null;
  phones: string[];
  emails: string[];
  officialEmails: string[];
  departments: { code: string; name: string }[];
  social: ExtractedInfo["social"];
  pagesVisited: string[];
  error?: string;
}

/**
 * Reads a college's public website (home page plus up to five about/contact/
 * department pages), honouring robots.txt. Findings only pre-fill the form;
 * they are never treated as proof of ownership.
 */
export async function analyzeWebsite(websiteUrl: string, emit: (e: AnalysisEvent) => void = () => {}): Promise<AnalysisResult> {
  const result: AnalysisResult = {
    status: "failed", websiteUrl, finalUrl: null, domain: registrableDomain(websiteUrl), name: null, description: null,
    logo: null, address: null, phones: [], emails: [], officialEmails: [], departments: [], social: {}, pagesVisited: [],
  };

  let home;
  try {
    emit({ type: "page", url: websiteUrl });
    home = await safeFetch(websiteUrl);
  } catch (err) {
    result.error = err instanceof FetchBlockedError
      ? "This address points to a private or local network and cannot be analysed."
      : "We could not reach this website. Check the address, or try again in a minute if the site is slow.";
    emit({ type: "step", key: "reachable", status: "fail", detail: result.error });
    return result;
  }
  if (home.status >= 400 || !/html/i.test(home.contentType)) {
    result.error = home.status >= 400
      ? `The website answered with an error (HTTP ${home.status}).`
      : "The address does not return a web page.";
    emit({ type: "step", key: "reachable", status: "fail", detail: result.error });
    return result;
  }
  result.finalUrl = home.url;
  result.domain = registrableDomain(home.url) ?? result.domain;
  emit({ type: "step", key: "reachable", status: "ok", detail: new URL(home.url).hostname });

  // robots.txt: respect it. If it forbids us, stop and let the college fill the form by hand.
  let robots = "";
  try {
    const r = await safeFetch(new URL("/robots.txt", home.url), { accept: "text/plain", maxBytes: 200_000 });
    if (r.status < 400) robots = r.body;
  } catch {
    /* no robots.txt is fine */
  }
  const origin = new URL(home.url).origin;
  if (robots && !isPathAllowed(robots, new URL(home.url).pathname || "/")) {
    result.status = "blocked";
    result.error = "The website's robots.txt asks automated tools not to read it, so we skipped the analysis. You can enter the details yourself.";
    emit({ type: "step", key: "robots", status: "warn", detail: "robots.txt disallows crawling" });
    return result;
  }
  emit({ type: "step", key: "robots", status: "ok" });

  const infos: ExtractedInfo[] = [extractFromHtml(home.body, home.url)];
  result.pagesVisited.push(home.url);

  for (const next of pickFollowUpPages(infos[0]!.links, origin)) {
    if (robots && !isPathAllowed(robots, new URL(next).pathname)) continue;
    try {
      emit({ type: "page", url: next });
      const page = await safeFetch(next);
      if (page.status < 400 && /html/i.test(page.contentType)) {
        infos.push(extractFromHtml(page.body, page.url));
        result.pagesVisited.push(page.url);
      }
    } catch {
      /* skip pages that fail; the home page is enough to continue */
    }
  }

  const first = <T,>(pick: (i: ExtractedInfo) => T | null | undefined) => infos.map(pick).find((v) => v) ?? null;
  result.name = first((i) => i.name);
  result.description = first((i) => i.description);
  result.logo = first((i) => i.logo);
  result.address = first((i) => i.address);
  result.phones = [...new Set(infos.flatMap((i) => i.phones))].slice(0, 5);
  result.emails = [...new Set(infos.flatMap((i) => i.emails))].slice(0, 30);
  result.officialEmails = result.domain ? rankOfficialEmails(result.emails, result.domain) : [];
  const depts = new Map<string, { code: string; name: string }>();
  infos.flatMap((i) => i.departments).forEach((d) => depts.set(d.code, d));
  result.departments = [...depts.values()];
  result.social = Object.assign({}, ...infos.map((i) => i.social).reverse());

  emit({ type: "step", key: "name", status: result.name ? "ok" : "warn", detail: result.name ?? "Not found; you can type it" });
  emit({ type: "step", key: "logo", status: result.logo ? "ok" : "warn", detail: result.logo ? undefined : "Not found; upload one later" });
  emit({
    type: "step", key: "contact", status: result.phones.length || result.address ? "ok" : "warn",
    detail: result.phones[0] ?? result.address ?? "Not found",
  });
  emit({
    type: "step", key: "email",
    status: result.officialEmails.length ? "ok" : "warn",
    detail: result.officialEmails[0] ?? (result.emails.length ? "Only addresses outside the college domain were found" : "No public email found"),
  });
  emit({
    type: "step", key: "departments", status: result.departments.length ? "ok" : "warn",
    detail: result.departments.length ? result.departments.map((d) => d.code).join(", ") : "None found; add them later",
  });

  result.status = "completed";
  return result;
}
