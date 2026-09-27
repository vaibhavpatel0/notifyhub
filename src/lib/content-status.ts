/** Status an admin sees for a notice or event, derived from status and dates. */
export function noticeState(n: { status: string; published_at: string; expires_at: string | null }, now = Date.now()) {
  if (n.status === "draft") return "draft";
  if (n.status === "archived") return "archived";
  if (new Date(n.published_at).getTime() > now) return "scheduled";
  if (n.expires_at && new Date(n.expires_at).getTime() <= now) return "expired";
  return "published";
}

export function eventState(e: { status: string; starts_at: string; ends_at: string | null }, now = Date.now()) {
  if (e.status === "draft") return "draft";
  const end = e.ends_at ? new Date(e.ends_at).getTime() : new Date(e.starts_at).getTime() + 3 * 3600_000;
  if (end < now) return "ended";
  if (new Date(e.starts_at).getTime() <= now) return "live";
  return "upcoming";
}
