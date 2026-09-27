import * as cheerio from "cheerio";

/** Known department names, matched against link text and headings. */
const DEPARTMENTS: { code: string; name: string; re: RegExp }[] = [
  { code: "CSE", name: "Computer Science and Engineering", re: /computer science\s*(?:&|and)?\s*engineering|\bC\.?S\.?E\b/i },
  { code: "IT", name: "Information Technology", re: /information technology/i },
  { code: "AIML", name: "Artificial Intelligence and Machine Learning", re: /artificial intelligence\s*(?:&|and)\s*machine learning|\bAI\s*&\s*ML\b|\bAIML\b/i },
  { code: "DS", name: "Data Science", re: /\bdata science\b/i },
  { code: "ECE", name: "Electronics and Communication Engineering", re: /electronics\s*(?:&|and)\s*communication|\bE\.?C\.?E\b/i },
  { code: "EEE", name: "Electrical and Electronics Engineering", re: /electrical\s*(?:&|and)\s*electronics|\bE\.?E\.?E\b/i },
  { code: "EIE", name: "Electronics and Instrumentation Engineering", re: /instrumentation engineering/i },
  { code: "MECH", name: "Mechanical Engineering", re: /mechanical engineering|\bMECH\b/i },
  { code: "CIVIL", name: "Civil Engineering", re: /civil engineering/i },
  { code: "CHEM", name: "Chemical Engineering", re: /chemical engineering/i },
  { code: "AERO", name: "Aeronautical Engineering", re: /aeronautical|aerospace engineering/i },
  { code: "AUTO", name: "Automobile Engineering", re: /automobile engineering/i },
  { code: "BT", name: "Biotechnology", re: /biotechnology/i },
  { code: "MBA", name: "Master of Business Administration", re: /\bMBA\b|business administration|management studies/i },
  { code: "MCA", name: "Master of Computer Applications", re: /\bMCA\b|computer applications/i },
  { code: "H&S", name: "Humanities and Sciences", re: /humanities\s*(?:&|and)\s*(?:basic\s*)?sciences|freshman engineering/i },
  { code: "PHARM", name: "Pharmacy", re: /\bpharmacy\b|pharmaceutical/i },
  { code: "ARCH", name: "Architecture", re: /\barchitecture\b/i },
];

const SOCIAL: [keyof ExtractedInfo["social"], RegExp][] = [
  ["facebook", /(?:^|\.)facebook\.com$/],
  ["instagram", /(?:^|\.)instagram\.com$/],
  ["x", /(?:^|\.)(?:twitter|x)\.com$/],
  ["linkedin", /(?:^|\.)linkedin\.com$/],
  ["youtube", /(?:^|\.)(?:youtube\.com|youtu\.be)$/],
];

export interface ExtractedInfo {
  name: string | null;
  description: string | null;
  logo: string | null;
  emails: string[];
  phones: string[];
  address: string | null;
  departments: { code: string; name: string }[];
  social: { facebook?: string; instagram?: string; x?: string; linkedin?: string; youtube?: string };
  links: { href: string; text: string }[];
}

const EMAIL_IN_TEXT = /[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/gi;
const PHONE_IN_TEXT = /(?:\+91[\s-]?)?(?:\(?0\d{2,4}\)?[\s-]?\d{6,8}|[6-9]\d{4}[\s-]?\d{5})/g;

export function extractFromHtml(html: string, pageUrl: string): ExtractedInfo {
  const $ = cheerio.load(html);
  const base = new URL(pageUrl);
  const abs = (href: string | undefined) => {
    if (!href) return null;
    try {
      const u = new URL(href, base);
      return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
    } catch {
      return null;
    }
  };

  const ogSite = $('meta[property="og:site_name"]').attr("content")?.trim();
  const title = $("title").first().text().trim();
  const h1 = $("h1").first().text().replace(/\s+/g, " ").trim();
  const name = pickName([ogSite, ...splitTitle(title), h1]);

  const description =
    $('meta[name="description"]').attr("content")?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim() ||
    null;

  let logo: string | null = null;
  $("img").each((_, el) => {
    if (logo) return;
    const img = $(el);
    const hay = `${img.attr("src") ?? ""} ${img.attr("alt") ?? ""} ${img.attr("class") ?? ""} ${img.attr("id") ?? ""}`;
    if (/logo/i.test(hay)) logo = abs(img.attr("src") ?? img.attr("data-src"));
  });
  logo ??= abs($('link[rel="apple-touch-icon"]').attr("href")) ?? abs($('meta[property="og:image"]').attr("content")) ?? abs($('link[rel~="icon"]').attr("href"));

  const emails = new Set<string>();
  $('a[href^="mailto:"]').each((_, el) => {
    const addr = decodeURIComponent(($(el).attr("href") ?? "").slice(7).split("?")[0] ?? "").trim().toLowerCase();
    if (addr) emails.add(addr);
  });
  $("script, style, noscript").remove();
  // Replace every tag with a space before reading text, so "a@b.in<br>Phone" is not read as "a@b.inPhone".
  const text = cheerio.load(($("body").html() ?? "").replace(/<[^>]+>/g, " ")).text().replace(/\s+/g, " ");
  for (const m of text.match(EMAIL_IN_TEXT) ?? []) {
    const e = m.toLowerCase().replace(/\.$/, "");
    if (!/\.(png|jpe?g|gif|webp|svg)$/.test(e)) emails.add(e);
  }

  const phones = new Set<string>();
  $('a[href^="tel:"]').each((_, el) => {
    const p = ($(el).attr("href") ?? "").slice(4).trim();
    if (p.replace(/\D/g, "").length >= 8) phones.add(p);
  });
  for (const m of text.match(PHONE_IN_TEXT) ?? []) {
    if (m.replace(/\D/g, "").length >= 10) phones.add(m.trim());
  }

  let address: string | null = $("address").first().text().replace(/\s+/g, " ").trim() || null;
  if (!address) {
    $('[class*="address" i], [id*="address" i]').each((_, el) => {
      if (address) return;
      const t = $(el).text().replace(/\s+/g, " ").trim();
      if (t.length > 15 && t.length < 400) address = t;
    });
  }
  if (!address) {
    const m = text.match(/Address\s*[:\-]\s*(.{15,220}?)(?:Phone|Tel|Email|E-mail|Contact|Mobile|$)/i);
    if (m) address = m[1]!.trim();
  }

  const links: ExtractedInfo["links"] = [];
  const social: ExtractedInfo["social"] = {};
  const deptHits = new Map<string, { code: string; name: string }>();
  $("a[href]").each((_, el) => {
    const href = abs($(el).attr("href"));
    const t = $(el).text().replace(/\s+/g, " ").trim();
    if (!href) return;
    const host = new URL(href).hostname;
    for (const [key, re] of SOCIAL) if (!social[key] && re.test(host)) social[key] = href;
    if (t) links.push({ href, text: t.slice(0, 120) });
    matchDepartments(t, deptHits);
  });
  // Short text blocks where colleges list departments: headings, lists, table cells, labels.
  $("h1, h2, h3, h4, h5, h6, li, td, th, dt, dd, strong, b, label, option, p").each((_, el) => {
    const t = $(el).text().replace(/\s+/g, " ").trim();
    if (t.length < 90) matchDepartments(t, deptHits);
  });

  return {
    name,
    description: description ? description.slice(0, 600) : null,
    logo,
    emails: [...emails].slice(0, 40),
    phones: [...phones].slice(0, 6),
    address: address ? String(address).slice(0, 300) : null,
    departments: [...deptHits.values()],
    social,
    links,
  };
}

function matchDepartments(text: string, into: Map<string, { code: string; name: string }>) {
  if (!text) return;
  for (const d of DEPARTMENTS) {
    if (!into.has(d.code) && d.re.test(text)) into.set(d.code, { code: d.code, name: d.name });
  }
}

function splitTitle(title: string) {
  return title.split(/\s[|\-–—:]\s/).map((s) => s.trim()).filter(Boolean);
}

/** Prefer the candidate that reads like an institution name. */
function pickName(candidates: (string | undefined | null)[]) {
  const list = candidates.filter((c): c is string => Boolean(c && c.length >= 4 && c.length <= 160));
  const institutional = list.find((c) => /college|institute|university|school|academy|vidyalaya|mahavidyalaya/i.test(c));
  const chosen = institutional ?? list.find((c) => !/^(home|welcome)$/i.test(c)) ?? null;
  return chosen ? chosen.replace(/^welcome to\s+/i, "").trim() : null;
}

/** Links on the home page worth visiting: about, contact, departments, admissions, administration. */
export function pickFollowUpPages(links: ExtractedInfo["links"], origin: string, limit = 5): string[] {
  const wanted: [string, RegExp][] = [
    ["about", /about|profile|overview|history/i],
    ["contact", /contact|reach us|location/i],
    ["departments", /department|academics|programmes|programs|courses|branches/i],
    ["administration", /administration|principal|leadership|management|governing/i],
    ["admissions", /admission/i],
  ];
  const originHost = new URL(origin).hostname.replace(/^www\./, "");
  const chosen: string[] = [];
  for (const [, re] of wanted) {
    const hit = links.find((l) => {
      try {
        const u = new URL(l.href);
        const sameSite = u.hostname.replace(/^www\./, "") === originHost;
        return sameSite && (re.test(l.text) || re.test(u.pathname)) && !/\.(pdf|jpe?g|png|docx?|zip)$/i.test(u.pathname) && !chosen.includes(u.toString());
      } catch {
        return false;
      }
    });
    if (hit) chosen.push(new URL(hit.href).toString().split("#")[0]!);
    if (chosen.length >= limit) break;
  }
  return [...new Set(chosen)];
}
