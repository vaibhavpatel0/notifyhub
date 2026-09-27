const DEFAULT_TZ = "Asia/Kolkata";

export function formatDate(iso: string, tz = DEFAULT_TZ) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: tz }).format(new Date(iso));
}

export function formatDateLong(iso: string, tz = DEFAULT_TZ) {
  return new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: tz }).format(new Date(iso));
}

export function formatTime(iso: string, tz = DEFAULT_TZ) {
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: tz }).format(new Date(iso));
}

export function formatDateTime(iso: string, tz = DEFAULT_TZ) {
  return `${formatDate(iso, tz)}, ${formatTime(iso, tz)}`;
}

/** Day and month parts for the calendar tile on event cards. */
export function dateParts(iso: string, tz = DEFAULT_TZ) {
  const d = new Date(iso);
  return {
    day: new Intl.DateTimeFormat("en-IN", { day: "numeric", timeZone: tz }).format(d),
    month: new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: tz }).format(d),
    weekday: new Intl.DateTimeFormat("en-IN", { weekday: "short", timeZone: tz }).format(d),
  };
}

export function relativeTime(iso: string, now = Date.now()) {
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const minute = 60_000, hour = 60 * minute, day = 24 * hour;
  if (abs < hour) return rtf.format(Math.round(diff / minute), "minute");
  if (abs < day) return rtf.format(Math.round(diff / hour), "hour");
  if (abs < 30 * day) return rtf.format(Math.round(diff / day), "day");
  return formatDate(iso);
}

/** Circular number as colleges write it: "No. 14/2026" */
export function refLabel(refNo: number | null, refYear: number | null) {
  if (!refNo || !refYear) return null;
  return `No. ${String(refNo).padStart(3, "0")}/${refYear}`;
}

export function isNew(iso: string, hours = 48, now = Date.now()) {
  return now - new Date(iso).getTime() < hours * 3600_000;
}

/**
 * Convert a wall-clock date + time entered for a college's timezone into an
 * ISO timestamp. Works for any IANA zone without extra libraries.
 */
export function zonedToIso(date: string, time: string, tz = DEFAULT_TZ): string {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = (time || "00:00").split(":").map(Number);
  const asUtc = Date.UTC(y, m - 1, d, hh, mm);
  const offset = tzOffsetMs(new Date(asUtc), tz);
  return new Date(asUtc - offset).toISOString();
}

/** The reverse: ISO timestamp to { date: "YYYY-MM-DD", time: "HH:MM" } in the college timezone. */
export function isoToZoned(iso: string, tz = DEFAULT_TZ) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${hour}:${get("minute")}` };
}

function tzOffsetMs(date: Date, tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - date.getTime();
}

export function initials(name: string) {
  const skip = new Set(["of", "and", "the", "for", "&", "in", "at"]);
  return name
    .split(/\s+/)
    .filter((w) => w && !skip.has(w.toLowerCase()))
    .slice(0, 3)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${Number((n / 1024 / 1024).toFixed(1))} MB`;
}

/** Wall-clock time for the current server render (one request = one render). */
export function requestTime() {
  return Date.now();
}

/** 1 -> "1st", 2 -> "2nd", 3 -> "3rd", 4 -> "4th" ... */
export function ordinal(n: number) {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${s}`;
}

/** [] -> "All years", [2] -> "2nd year", [2, 3, 4] -> "2nd, 3rd & 4th year" */
export function formatYears(years: readonly number[] | null | undefined) {
  const list = [...new Set(years ?? [])].sort((a, b) => a - b);
  if (list.length === 0) return "All years";
  const parts = list.map(ordinal);
  const joined = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} & ${parts[parts.length - 1]}`;
  return `${joined} year`;
}

/** Reads the `years` checkboxes of a form: unique, sorted, 1 to 6. Selecting every year means "all years". */
export function parseYears(values: FormDataEntryValue[], maxYears = 6): number[] {
  const list = [...new Set(values.map((v) => Number(v)).filter((n) => Number.isInteger(n) && n >= 1 && n <= Math.min(maxYears, 6)))].sort((a, b) => a - b);
  return list.length >= maxYears ? [] : list;
}

/** Best guess at a department's course length from its code or name; admins can change it. */
export function defaultCourseYears(code: string, name: string) {
  const c = code.toUpperCase().replace(/[.\s]/g, "");
  if (["MBA", "MCA", "MTECH", "MSC", "MCOM", "MA", "PGDM"].includes(c) || /^(master|m\.? ?tech|post ?graduate)/i.test(name)) return 2;
  if (c === "BARCH" || /architecture/i.test(name)) return 5;
  return 4;
}
