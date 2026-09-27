import "server-only";
import dns from "node:dns";
import net from "node:net";
import { Agent, fetch as undiciFetch } from "undici";

/**
 * Fetches public web pages on behalf of the onboarding analyser without
 * letting a submitted URL reach private infrastructure (SSRF protection):
 *  - only http/https on ports 80/443
 *  - every DNS answer is checked at connect time, so a hostname cannot
 *    resolve to 127.0.0.1, 10.x, 169.254.169.254 (cloud metadata) and so on,
 *    including via DNS rebinding
 *  - redirects are followed manually and re-validated (max 4)
 *  - responses are capped in size and time
 */
export const USER_AGENT = "NotifyHubBot/1.0 (+https://notifyhub.in/verification; college onboarding)";
const MAX_BYTES = 1_500_000;
const TIMEOUT_MS = 9000;

export class FetchBlockedError extends Error {}

export function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number) as [number, number];
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    if (v === "::" || v === "::1") return true;
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]!);
    return v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe8") || v.startsWith("fe9") || v.startsWith("fea") || v.startsWith("feb") || v.startsWith("ff");
  }
  return true;
}

const guardedLookup: typeof dns.lookup = ((hostname: string, options: dns.LookupOptions, callback: (...args: unknown[]) => void) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err);
    const list = (addresses as dns.LookupAddress[]).filter((a) => !isPrivateAddress(a.address));
    if (list.length === 0) return callback(new FetchBlockedError(`${hostname} resolves to a private address`));
    if (options?.all) return callback(null, list);
    callback(null, list[0]!.address, list[0]!.family);
  });
}) as unknown as typeof dns.lookup;

const agent = new Agent({ connect: { lookup: guardedLookup, timeout: 6000 }, headersTimeout: TIMEOUT_MS, bodyTimeout: TIMEOUT_MS });

export interface FetchedPage {
  url: string;
  status: number;
  contentType: string;
  body: string;
}

export function assertPublicUrl(url: URL) {
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new FetchBlockedError("Only http and https addresses are allowed");
  if (url.port && url.port !== "80" && url.port !== "443") throw new FetchBlockedError("Non-standard ports are not allowed");
  if (url.username || url.password) throw new FetchBlockedError("Addresses with credentials are not allowed");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host) && isPrivateAddress(host)) throw new FetchBlockedError("Private addresses are not allowed");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new FetchBlockedError("Local addresses are not allowed");
  }
}

export interface FetchedBytes {
  url: string;
  status: number;
  contentType: string;
  bytes: Uint8Array;
  truncated: boolean;
}

export async function safeFetchBytes(input: string | URL, opts: { accept?: string; maxBytes?: number } = {}): Promise<FetchedBytes> {
  let url = new URL(input);
  for (let hop = 0; hop < 5; hop++) {
    assertPublicUrl(url);
    const res = await undiciFetch(url, {
      dispatcher: agent,
      redirect: "manual",
      headers: { "User-Agent": USER_AGENT, Accept: opts.accept ?? "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = new URL(res.headers.get("location")!, url);
      await res.body?.cancel();
      continue;
    }
    const { bytes, truncated } = await readCapped(res.body as ReadableStream<Uint8Array> | null, opts.maxBytes ?? MAX_BYTES);
    return { url: url.toString(), status: res.status, contentType: res.headers.get("content-type") ?? "", bytes, truncated };
  }
  throw new FetchBlockedError("Too many redirects");
}

export async function safeFetch(input: string | URL, opts: { accept?: string; maxBytes?: number } = {}): Promise<FetchedPage> {
  const res = await safeFetchBytes(input, opts);
  return { url: res.url, status: res.status, contentType: res.contentType, body: new TextDecoder("utf-8", { fatal: false }).decode(res.bytes) };
}

async function readCapped(stream: ReadableStream<Uint8Array> | null, max: number) {
  if (!stream) return { bytes: new Uint8Array(), truncated: false };
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let truncated = false;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      chunks.push(value.slice(0, value.byteLength - (total - max)));
      truncated = true;
      await reader.cancel();
      break;
    }
    chunks.push(value);
  }
  return { bytes: new Uint8Array(Buffer.concat(chunks)), truncated };
}
