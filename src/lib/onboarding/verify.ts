import "server-only";
import dns from "node:dns/promises";
import * as cheerio from "cheerio";
import { safeFetch } from "./safe-fetch";

export const DNS_RECORD_HOST = (domain: string) => `_notifyhub.${domain}`;
export const DNS_RECORD_VALUE = (token: string) => `notifyhub-verification=${token}`;
export const META_TAG = (token: string) => `<meta name="notifyhub-verification" content="${token}">`;

/** TXT record _notifyhub.<domain> must contain notifyhub-verification=<token>. */
export async function checkDnsVerification(domain: string, token: string): Promise<boolean> {
  try {
    const records = await dns.resolveTxt(DNS_RECORD_HOST(domain));
    return records.some((chunks) => chunks.join("").trim() === DNS_RECORD_VALUE(token));
  } catch {
    return false;
  }
}

/** The official home page must carry <meta name="notifyhub-verification" content="<token>">. */
export async function checkMetaVerification(websiteUrl: string, token: string): Promise<boolean> {
  try {
    const page = await safeFetch(websiteUrl);
    if (page.status >= 400) return false;
    const $ = cheerio.load(page.body);
    return $('meta[name="notifyhub-verification"]').toArray().some((el) => $(el).attr("content")?.trim() === token);
  } catch {
    return false;
  }
}
