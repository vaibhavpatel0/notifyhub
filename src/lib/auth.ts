import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { portalPath } from "@/lib/tenant";
import type { AdminMember, College } from "@/lib/types";

/** Verified user for this request (checks the JWT with Supabase Auth). */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
});

export const isPlatformAdmin = cache(async () => {
  const user = await getUser();
  if (!user) return false;
  const supabase = await createClient();
  const { data } = await supabase.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle();
  return Boolean(data);
});

/** All colleges the signed-in user administers (used after login to pick a destination). */
export async function getMemberships() {
  const user = await getUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("admins")
    .select("id, role, status, college:colleges(id, name, slug, status)")
    .eq("user_id", user.id)
    .eq("status", "active");
  return (data ?? []) as unknown as Array<{
    id: string;
    role: AdminMember["role"];
    college: Pick<College, "id" | "name" | "slug" | "status">;
  }>;
}

export interface AdminContext {
  userId: string;
  email: string;
  college: College;
  member: AdminMember;
  isCollegeAdmin: boolean;
  /** department the member is restricted to (department admins only) */
  departmentId: string | null;
}

/**
 * Gatekeeper for /admin pages of a college portal. The database enforces the
 * same rules through RLS; this only decides what to render and where to redirect.
 */
export const requireCollegeMember = cache(async (slug: string): Promise<AdminContext> => {
  const user = await getUser();
  if (!user) redirect(portalPath(slug, `/login?next=${encodeURIComponent(portalPath(slug, "/admin"))}`));

  const supabase = await createClient();
  const { data: college } = await supabase.from("colleges").select("*").eq("slug", slug).maybeSingle();
  const { data: member } = college
    ? await supabase
        .from("admins")
        .select("*, department:departments(id, name, code, slug, years_count)")
        .eq("college_id", college.id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle()
    : { data: null };

  if (!college || !member) redirect(portalPath(slug, "/login?error=not_member"));

  return {
    userId: user.id,
    email: user.email ?? "",
    college: college as College,
    member: member as AdminMember,
    isCollegeAdmin: member.role === "college_admin",
    departmentId: member.role === "department_admin" ? member.department_id : null,
  };
});

export async function requireCollegeAdmin(slug: string) {
  const ctx = await requireCollegeMember(slug);
  if (!ctx.isCollegeAdmin) redirect(portalPath(slug, "/admin?error=college_admin_only"));
  return ctx;
}

export async function requirePlatformAdmin() {
  const user = await getUser();
  if (!user) redirect("/login?next=/super-admin");
  if (!(await isPlatformAdmin())) redirect("/login?error=not_platform_admin");
  return user;
}
