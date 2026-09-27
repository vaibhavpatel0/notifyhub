"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireCollegeAdmin, requireCollegeMember, type AdminContext } from "@/lib/auth";
import { BRAND_COLORS, STORAGE_BUCKET } from "@/lib/constants";
import { SUPABASE_URL } from "@/lib/env";
import { addTeamMember } from "@/lib/account-links";
import { zonedToIso } from "@/lib/format";
import { slugify } from "@/lib/onboarding/slug";
import { createClient } from "@/lib/supabase/server";
import { portalPath } from "@/lib/tenant";
import type { ActionResult } from "@/lib/types";

/*
 * Every admin write goes through the signed-in user's Supabase client, so
 * Row Level Security is the final authority: a department admin who crafts
 * a request for another department is rejected by the database itself.
 * The checks here exist to give clear messages, not as the security boundary.
 */

const GENERIC = "Could not save. Please try again.";
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const bool = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true";

function dbError(error: { code?: string; message?: string } | null, fallback = GENERIC): string {
  if (!error) return fallback;
  if (error.code === "42501" || /row-level security/i.test(error.message ?? "")) return "You do not have permission to do that.";
  if (error.code === "23505") return "Something with that name or address already exists.";
  if (error.code === "23503") return "This item is still in use. Remove or reassign what depends on it first.";
  if (error.code === "23514" && /college admin/i.test(error.message ?? "")) return "A college needs at least one active college admin.";
  console.error("admin action", error);
  return fallback;
}

/** Uploaded files must live in this college's folder of our own bucket. */
function ownFileUrl(url: string, collegeId: string): string | null {
  if (!url) return null;
  const prefix = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${collegeId}/`;
  return url.startsWith(prefix) && !url.includes("..") ? url : null;
}

function fieldErrors(error: z.ZodError): ActionResult<never> {
  const out: Record<string, string> = {};
  for (const i of error.issues) out[String(i.path[0])] ??= i.message;
  return { ok: false, error: "Check the highlighted fields.", fieldErrors: out };
}

async function ctxFrom(fd: FormData): Promise<AdminContext> {
  return requireCollegeMember(str(fd, "college"));
}

// ---------------------------------------------------------------------------
// Announcements
// ---------------------------------------------------------------------------

const announcementSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().trim().max(20000, "Keep the description under 20,000 characters"),
  category: z.string().regex(/^[a-z][a-z0-9-]{1,39}$/, "Choose a category"),
  scope: z.enum(["college", "department"]),
  department_id: z.string().uuid().nullable(),
  is_urgent: z.boolean(),
  is_pinned: z.boolean(),
  publish: z.enum(["now", "schedule", "draft"]),
  publish_date: z.string().optional(),
  publish_time: z.string().optional(),
  expires_date: z.string().optional(),
  expires_time: z.string().optional(),
});

export async function saveAnnouncement(_prev: unknown, fd: FormData): Promise<ActionResult> {
  const ctx = await ctxFrom(fd);
  const id = str(fd, "id") || null;
  const parsed = announcementSchema.safeParse({
    title: str(fd, "title"),
    description: str(fd, "description"),
    category: str(fd, "category"),
    scope: ctx.departmentId ? "department" : str(fd, "scope") || "college",
    department_id: ctx.departmentId ?? (str(fd, "scope") === "department" ? str(fd, "department_id") || null : null),
    is_urgent: bool(fd, "is_urgent"),
    is_pinned: bool(fd, "is_pinned"),
    publish: str(fd, "publish") || "now",
    publish_date: str(fd, "publish_date"),
    publish_time: str(fd, "publish_time"),
    expires_date: str(fd, "expires_date"),
    expires_time: str(fd, "expires_time"),
  });
  if (!parsed.success) return fieldErrors(parsed.error);
  const v = parsed.data;
  if (v.scope === "department" && !v.department_id) return { ok: false, error: "Choose a department.", fieldErrors: { department_id: "Choose a department" } };

  const tz = ctx.college.timezone;
  let publishedAt = new Date().toISOString();
  if (v.publish === "schedule") {
    if (!v.publish_date) return { ok: false, error: "Choose when to publish.", fieldErrors: { publish_date: "Choose a date" } };
    publishedAt = zonedToIso(v.publish_date, v.publish_time || "09:00", tz);
  }
  const expiresAt = v.expires_date ? zonedToIso(v.expires_date, v.expires_time || "23:59", tz) : null;
  if (expiresAt && new Date(expiresAt) <= new Date(publishedAt)) {
    return { ok: false, error: "The expiry must be after the publish time.", fieldErrors: { expires_date: "Must be after publishing" } };
  }

  const imageRaw = str(fd, "image_url");
  const attachRaw = str(fd, "attachment_url");
  const image_url = ownFileUrl(imageRaw, ctx.college.id);
  const attachment_url = ownFileUrl(attachRaw, ctx.college.id);
  if ((imageRaw && !image_url) || (attachRaw && !attachment_url)) return { ok: false, error: "Upload files with the upload button." };

  const row = {
    title: v.title,
    description: v.description,
    category: v.category,
    scope: v.scope,
    department_id: v.scope === "department" ? v.department_id : null,
    is_urgent: v.is_urgent,
    is_pinned: v.is_pinned,
    status: v.publish === "draft" ? "draft" : "published",
    // keep the original publish time when editing an already-published notice
    ...(id && v.publish === "now" && str(fd, "keep_published_at") ? {} : { published_at: publishedAt }),
    expires_at: expiresAt,
    image_url,
    attachment_url,
    attachment_name: attachment_url ? str(fd, "attachment_name").slice(0, 200) || null : null,
  };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("announcements").update(row).eq("id", id).eq("college_id", ctx.college.id)
    : await supabase.from("announcements").insert({ ...row, college_id: ctx.college.id, created_by: ctx.userId });
  if (error) return { ok: false, error: dbError(error) };

  revalidatePath("/", "layout");
  redirect(portalPath(ctx.college.slug!, `/admin/announcements?saved=${v.publish === "draft" ? "draft" : v.publish === "schedule" ? "scheduled" : "published"}`));
}

export async function deleteAnnouncement(fd: FormData) {
  const ctx = await ctxFrom(fd);
  const supabase = await createClient();
  const { error } = await supabase.from("announcements").delete().eq("id", str(fd, "id")).eq("college_id", ctx.college.id);
  redirect(portalPath(ctx.college.slug!, `/admin/announcements?${error ? "error=delete" : "saved=deleted"}`));
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

const eventSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().trim().max(20000),
  scope: z.enum(["college", "department"]),
  department_id: z.string().uuid().nullable(),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the event date"),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Choose a start time"),
  end_date: z.string().optional(),
  end_time: z.string().optional(),
  venue: z.string().trim().max(200),
  organizer: z.string().trim().max(200),
  registration_url: z.string().trim().max(500).refine((u) => !u || /^https?:\/\/\S+$/.test(u), "Use a full link starting with https://"),
  countdown_enabled: z.boolean(),
  status: z.enum(["published", "draft"]),
});

export async function saveEvent(_prev: unknown, fd: FormData): Promise<ActionResult> {
  const ctx = await ctxFrom(fd);
  const id = str(fd, "id") || null;
  const parsed = eventSchema.safeParse({
    title: str(fd, "title"),
    description: str(fd, "description"),
    scope: ctx.departmentId ? "department" : str(fd, "scope") || "college",
    department_id: ctx.departmentId ?? (str(fd, "scope") === "department" ? str(fd, "department_id") || null : null),
    event_date: str(fd, "event_date"),
    start_time: str(fd, "start_time"),
    end_date: str(fd, "end_date"),
    end_time: str(fd, "end_time"),
    venue: str(fd, "venue"),
    organizer: str(fd, "organizer"),
    registration_url: str(fd, "registration_url"),
    countdown_enabled: bool(fd, "countdown_enabled"),
    status: str(fd, "status") === "draft" ? "draft" : "published",
  });
  if (!parsed.success) return fieldErrors(parsed.error);
  const v = parsed.data;
  if (v.scope === "department" && !v.department_id) return { ok: false, error: "Choose a department.", fieldErrors: { department_id: "Choose a department" } };

  const tz = ctx.college.timezone;
  const startsAt = zonedToIso(v.event_date, v.start_time, tz);
  const endsAt = v.end_time ? zonedToIso(v.end_date || v.event_date, v.end_time, tz) : null;
  if (endsAt && new Date(endsAt) <= new Date(startsAt)) {
    return { ok: false, error: "The end must be after the start.", fieldErrors: { end_time: "Must be after the start" } };
  }

  const imageRaw = str(fd, "image_url");
  const attachRaw = str(fd, "attachment_url");
  const image_url = ownFileUrl(imageRaw, ctx.college.id);
  const attachment_url = ownFileUrl(attachRaw, ctx.college.id);
  if ((imageRaw && !image_url) || (attachRaw && !attachment_url)) return { ok: false, error: "Upload files with the upload button." };

  const row = {
    title: v.title,
    description: v.description,
    scope: v.scope,
    department_id: v.scope === "department" ? v.department_id : null,
    starts_at: startsAt,
    ends_at: endsAt,
    venue: v.venue || null,
    organizer: v.organizer || null,
    registration_url: v.registration_url || null,
    countdown_enabled: v.countdown_enabled,
    status: v.status,
    image_url,
    attachment_url,
    attachment_name: attachment_url ? str(fd, "attachment_name").slice(0, 200) || null : null,
  };
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("events").update(row).eq("id", id).eq("college_id", ctx.college.id)
    : await supabase.from("events").insert({ ...row, college_id: ctx.college.id, created_by: ctx.userId });
  if (error) return { ok: false, error: dbError(error) };

  revalidatePath("/", "layout");
  redirect(portalPath(ctx.college.slug!, `/admin/events?saved=${v.status}`));
}

export async function deleteEvent(fd: FormData) {
  const ctx = await ctxFrom(fd);
  const supabase = await createClient();
  const { error } = await supabase.from("events").delete().eq("id", str(fd, "id")).eq("college_id", ctx.college.id);
  redirect(portalPath(ctx.college.slug!, `/admin/events?${error ? "error=delete" : "saved=deleted"}`));
}

// ---------------------------------------------------------------------------
// Departments (college admins)
// ---------------------------------------------------------------------------

const departmentSchema = z.object({
  name: z.string().trim().min(2, "Enter the department name").max(120),
  code: z.string().trim().regex(/^[A-Za-z0-9&.\- ]{1,12}$/, "Use up to 12 letters or numbers, e.g. CSE"),
  slug: z.string().regex(/^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){0,39}$/, "Use lowercase letters, numbers and hyphens"),
  description: z.string().trim().max(2000),
  head_name: z.string().trim().max(120),
  show_head: z.boolean(),
  status: z.enum(["active", "hidden"]),
  sort_order: z.coerce.number().int().min(0).max(999),
});

export async function saveDepartment(_prev: unknown, fd: FormData): Promise<ActionResult> {
  const ctx = await requireCollegeAdmin(str(fd, "college"));
  const id = str(fd, "id") || null;
  const parsed = departmentSchema.safeParse({
    name: str(fd, "name"),
    code: str(fd, "code").toUpperCase(),
    slug: slugify(str(fd, "slug") || str(fd, "code") || str(fd, "name")),
    description: str(fd, "description"),
    head_name: str(fd, "head_name"),
    show_head: bool(fd, "show_head"),
    status: str(fd, "status") === "hidden" ? "hidden" : "active",
    sort_order: str(fd, "sort_order") || "0",
  });
  if (!parsed.success) return fieldErrors(parsed.error);
  const imageRaw = str(fd, "image_url");
  const image_url = ownFileUrl(imageRaw, ctx.college.id);
  if (imageRaw && !image_url) return { ok: false, error: "Upload the image with the upload button." };

  const supabase = await createClient();
  const row = { ...parsed.data, description: parsed.data.description || null, head_name: parsed.data.head_name || null, image_url };
  const { error } = id
    ? await supabase.from("departments").update(row).eq("id", id).eq("college_id", ctx.college.id)
    : await supabase.from("departments").insert({ ...row, college_id: ctx.college.id });
  if (error) {
    return error.code === "23505"
      ? { ok: false, error: "Another department already uses that web address.", fieldErrors: { slug: "Already used" } }
      : { ok: false, error: dbError(error) };
  }
  revalidatePath("/", "layout");
  redirect(portalPath(ctx.college.slug!, "/admin/departments?saved=1"));
}

export async function deleteDepartment(fd: FormData) {
  const ctx = await requireCollegeAdmin(str(fd, "college"));
  const supabase = await createClient();
  const { error } = await supabase.from("departments").delete().eq("id", str(fd, "id")).eq("college_id", ctx.college.id);
  redirect(portalPath(ctx.college.slug!, `/admin/departments?${error ? (error.code === "23503" ? "error=has_admins" : "error=delete") : "saved=deleted"}`));
}

// ---------------------------------------------------------------------------
// College profile (college admins)
// ---------------------------------------------------------------------------

const url = z.string().trim().max(300).refine((u) => !u || /^https?:\/\/\S+$/.test(u), "Use a full link starting with https://");
const profileSchema = z.object({
  name: z.string().trim().min(2).max(200),
  short_name: z.string().trim().max(20),
  welcome_heading: z.string().trim().max(120),
  welcome_text: z.string().trim().max(600),
  description: z.string().trim().max(600),
  about: z.string().trim().max(8000),
  address: z.string().trim().max(400),
  phone: z.string().trim().max(40),
  contact_email: z.string().trim().max(200).refine((e) => !e || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e), "Enter a valid email"),
  brand_color: z.string().refine((c) => BRAND_COLORS.some((b) => b.value === c), "Choose one of the colours"),
  facebook: url, instagram: url, x: url, linkedin: url, youtube: url,
});

const SECTIONS = ["urgent", "important", "announcements", "events", "departments", "about", "contact"] as const;

export async function saveProfile(_prev: unknown, fd: FormData): Promise<ActionResult> {
  const ctx = await requireCollegeAdmin(str(fd, "college"));
  const raw = Object.fromEntries(["name", "short_name", "welcome_heading", "welcome_text", "description", "about", "address", "phone", "contact_email", "brand_color", "facebook", "instagram", "x", "linkedin", "youtube"].map((k) => [k, str(fd, k)]));
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) return fieldErrors(parsed.error);
  const v = parsed.data;

  const logoRaw = str(fd, "logo_url");
  const coverRaw = str(fd, "cover_image_url");
  const logo_url = ownFileUrl(logoRaw, ctx.college.id);
  const cover_image_url = ownFileUrl(coverRaw, ctx.college.id);
  if ((logoRaw && !logo_url) || (coverRaw && !cover_image_url)) return { ok: false, error: "Upload images with the upload buttons." };

  const social = Object.fromEntries(
    (["facebook", "instagram", "x", "linkedin", "youtube"] as const).filter((k) => v[k]).map((k) => [k, v[k]]),
  );
  const supabase = await createClient();
  const { error } = await supabase
    .from("colleges")
    .update({
      name: v.name,
      short_name: v.short_name || null,
      welcome_heading: v.welcome_heading || null,
      welcome_text: v.welcome_text || null,
      description: v.description || null,
      about: v.about || null,
      address: v.address || null,
      phone: v.phone || null,
      contact_email: v.contact_email || null,
      brand_color: v.brand_color,
      social_links: { ...social, website: ctx.college.official_website },
      homepage_sections: Object.fromEntries(SECTIONS.map((s) => [s, bool(fd, `section_${s}`)])),
      logo_url,
      cover_image_url,
    })
    .eq("id", ctx.college.id);
  if (error) return { ok: false, error: dbError(error) };
  revalidatePath("/", "layout");
  return { ok: true, message: "Profile saved. The public portal shows the changes now." };
}

// ---------------------------------------------------------------------------
// Team (college admins)
// ---------------------------------------------------------------------------

const inviteSchema = z.object({
  name: z.string().trim().min(2, "Enter their name").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  role: z.enum(["college_admin", "department_admin"]),
  department_id: z.string().uuid().nullable(),
});

export async function inviteAdmin(_prev: unknown, fd: FormData): Promise<ActionResult<{ link?: string }>> {
  const ctx = await requireCollegeAdmin(str(fd, "college"));
  const parsed = inviteSchema.safeParse({
    name: str(fd, "name"),
    email: str(fd, "email"),
    role: str(fd, "role"),
    department_id: str(fd, "role") === "department_admin" ? str(fd, "department_id") || null : null,
  });
  if (!parsed.success) return fieldErrors(parsed.error);
  const v = parsed.data;
  if (v.role === "department_admin" && !v.department_id) return { ok: false, error: "Choose their department.", fieldErrors: { department_id: "Choose a department" } };

  // The membership itself is written with the admin's own session, so RLS applies.
  const supabase = await createClient();
  const outcome = await addTeamMember({
    email: v.email,
    name: v.name,
    collegeName: ctx.college.name,
    roleLabel: v.role === "college_admin" ? "a college admin" : "a department admin",
    insertMembership: async (userId) => {
      const { error } = await supabase.from("admins").insert({
        college_id: ctx.college.id,
        user_id: userId,
        name: v.name,
        email: v.email,
        role: v.role,
        department_id: v.role === "department_admin" ? v.department_id : null,
      });
      if (error && error.code !== "23505") console.error("admins insert", error);
      return error?.code ?? null;
    },
  });
  revalidatePath(portalPath(ctx.college.slug!, "/admin/admins"));
  switch (outcome.status) {
    case "duplicate":
      return { ok: false, error: "That person is already on your team." };
    case "failed":
      return { ok: false, error: outcome.error };
    case "existing":
      return { ok: true, message: `${v.name} already has a NotifyHub account and can sign in now.` };
    case "sent":
      return { ok: true, message: `Invitation sent to ${v.email}. They choose a password from the email, then sign in.` };
    case "link":
      return {
        ok: true,
        data: { link: outcome.link },
        message: `${v.name} is added, but the invitation email could not be sent. Send them this one-time link yourself (for example on WhatsApp). It expires in 24 hours.`,
      };
  }
}

export async function updateAdmin(fd: FormData) {
  const ctx = await requireCollegeAdmin(str(fd, "college"));
  const id = str(fd, "id");
  const op = str(fd, "op");
  const supabase = await createClient();
  let error;
  if (op === "remove") {
    ({ error } = await supabase.from("admins").delete().eq("id", id).eq("college_id", ctx.college.id));
  } else if (op === "disable" || op === "enable") {
    ({ error } = await supabase.from("admins").update({ status: op === "disable" ? "disabled" : "active" }).eq("id", id).eq("college_id", ctx.college.id));
  }
  redirect(portalPath(ctx.college.slug!, `/admin/admins?${error ? `error=${error.code === "23514" ? "last_admin" : "update"}` : "saved=1"}`));
}

// ---------------------------------------------------------------------------
// Account and notifications
// ---------------------------------------------------------------------------

export async function changePassword(_prev: unknown, fd: FormData): Promise<ActionResult> {
  await ctxFrom(fd);
  const password = str(fd, "password");
  if (password.length < 10 || !/[a-z]/i.test(password) || !/\d/.test(password)) {
    return { ok: false, error: "Use at least 10 characters, with a letter and a number.", fieldErrors: { password: "Too weak" } };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, error: error.message };
  return { ok: true, message: "Password changed." };
}

export async function markNotificationsRead(ids: string[]) {
  const supabase = await createClient();
  if (!ids.length) return;
  await supabase.from("notifications").update({ is_read: true }).in("id", ids.slice(0, 100));
}
