import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Announcement, CampusEvent, College, Department } from "@/lib/types";

const DEPT_REF = "department:departments(id, name, code, slug)";

/** Active college for the public portal. RLS only returns colleges with status = active. */
export const getPublicCollege = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data } = await supabase.from("colleges").select("*").eq("slug", slug).eq("status", "active").maybeSingle();
  return (data as College | null) ?? null;
});

export const getPortalStatus = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("portal_status", { p_slug: slug });
  return (data as string | null) ?? null;
});

export const getPublicDepartments = cache(async (collegeId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("departments")
    .select("*")
    .eq("college_id", collegeId)
    .eq("status", "active")
    .order("sort_order")
    .order("name");
  return (data ?? []) as Department[];
});

/** Live announcements. Visibility (published, not expired, not scheduled) is enforced by RLS and repeated here for admins. */
export async function getLiveAnnouncements(
  collegeId: string,
  opts: { scope?: "college" | "department"; departmentId?: string; urgent?: boolean; pinned?: boolean; limit?: number } = {},
) {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  let q = supabase
    .from("announcements")
    .select(`*, ${DEPT_REF}`)
    .eq("college_id", collegeId)
    .eq("status", "published")
    .lte("published_at", nowIso)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order("is_urgent", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(opts.limit ?? 10);
  if (opts.scope) q = q.eq("scope", opts.scope);
  if (opts.departmentId) q = q.eq("department_id", opts.departmentId);
  if (opts.urgent !== undefined) q = q.eq("is_urgent", opts.urgent);
  if (opts.pinned !== undefined) q = q.eq("is_pinned", opts.pinned);
  const { data } = await q;
  return (data ?? []) as Announcement[];
}

export async function getPublicAnnouncement(collegeId: string, id: string) {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const { data } = await supabase
    .from("announcements")
    .select(`*, ${DEPT_REF}`)
    .eq("college_id", collegeId)
    .eq("id", id)
    .eq("status", "published")
    .lte("published_at", nowIso)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .maybeSingle();
  return (data as Announcement | null) ?? null;
}

export async function getPublicEvents(
  collegeId: string,
  opts: { when?: "upcoming" | "past"; departmentId?: string; scope?: "college" | "department"; limit?: number } = {},
) {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  let q = supabase.from("events").select(`*, ${DEPT_REF}`).eq("college_id", collegeId).eq("status", "published");
  if (opts.when === "upcoming") {
    // still running or yet to start
    q = q.or(`ends_at.gte.${nowIso},and(ends_at.is.null,starts_at.gte.${new Date(Date.now() - 3 * 3600_000).toISOString()})`).order("starts_at");
  } else if (opts.when === "past") {
    q = q.or(`ends_at.lt.${nowIso},and(ends_at.is.null,starts_at.lt.${new Date(Date.now() - 3 * 3600_000).toISOString()})`).order("starts_at", { ascending: false });
  } else {
    q = q.order("starts_at");
  }
  if (opts.departmentId) q = q.eq("department_id", opts.departmentId);
  if (opts.scope) q = q.eq("scope", opts.scope);
  const { data } = await q.limit(opts.limit ?? 20);
  return (data ?? []) as CampusEvent[];
}

export async function getPublicEvent(collegeId: string, id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select(`*, ${DEPT_REF}`)
    .eq("college_id", collegeId)
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();
  return (data as CampusEvent | null) ?? null;
}
