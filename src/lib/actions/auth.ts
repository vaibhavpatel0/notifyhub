"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createAccountLink, deliverAccountLink } from "@/lib/account-links";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { portalPath, portalUrl } from "@/lib/tenant";
import type { ActionResult } from "@/lib/types";

/** Only same-site relative paths are allowed as post-login destinations (no open redirects). */
function safeNext(next: FormDataEntryValue | null): string | null {
  const v = typeof next === "string" ? next : "";
  return v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : null;
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter your email address"),
  password: z.string().min(1, "Enter your password"),
});

export async function signIn(_prev: unknown, formData: FormData): Promise<ActionResult<{ choices: { name: string; url: string }[] }>> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]!.message };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    if (error?.message?.toLowerCase().includes("not confirmed")) {
      return { ok: false, error: "Confirm your email address first. Check your inbox for the confirmation link." };
    }
    return { ok: false, error: "Email or password is incorrect." };
  }

  const next = safeNext(formData.get("next"));
  const college = typeof formData.get("college") === "string" ? String(formData.get("college")) : "";

  // Signing in on a college portal: must be a member of that college.
  if (college) {
    const { data: member } = await supabase
      .from("admins")
      .select("id, college:colleges!inner(slug)")
      .eq("user_id", data.user.id)
      .eq("status", "active")
      .eq("college.slug", college)
      .maybeSingle();
    if (!member) {
      await supabase.auth.signOut();
      return { ok: false, error: "This account is not an admin of this college." };
    }
    redirect(next ?? portalPath(college, "/admin"));
  }

  // Signing in on the platform: send people to the right place.
  const { data: platform } = await supabase.from("platform_admins").select("user_id").eq("user_id", data.user.id).maybeSingle();
  if (platform && (!next || next.startsWith("/super-admin"))) redirect(next ?? "/super-admin");

  const { data: memberships } = await supabase
    .from("admins")
    .select("college:colleges(name, slug)")
    .eq("user_id", data.user.id)
    .eq("status", "active");
  const colleges = (memberships ?? [])
    .map((m) => m.college as unknown as { name: string; slug: string | null } | null)
    .filter((c): c is { name: string; slug: string } => Boolean(c?.slug));

  if (colleges.length === 1) redirect(portalUrl(colleges[0]!.slug, "/admin"));
  if (colleges.length > 1) {
    return { ok: true, data: { choices: colleges.map((c) => ({ name: c.name, url: portalUrl(c.slug, "/admin") })) } };
  }
  if (platform) redirect("/super-admin");
  await supabase.auth.signOut();
  return { ok: false, error: "This account is not linked to any college yet. If you were invited, ask your college admin to check your email address." };
}

export async function signOut(formData: FormData) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const college = formData.get("college");
  redirect(typeof college === "string" && college ? portalPath(college, "/login") : "/login");
}

export async function requestPasswordReset(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!z.string().email().safeParse(email).success) return { ok: false, error: "Enter your email address." };
  const { data: userId } = await createAdminClient().rpc("auth_user_id", { p_email: email });
  if (userId) {
    const link = await createAccountLink("recovery", email, { next: "/reset-password" });
    if (link.ok) {
      const delivered = await deliverAccountLink("recovery", email, link.url);
      if (delivered !== "sent") console.error("password reset email not delivered:", delivered);
    }
  }
  // Same answer whether or not the account exists, so addresses cannot be probed.
  return { ok: true, message: "If an account exists for that address, a reset link is on its way. The link works once and expires in an hour." };
}

export async function updatePassword(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 10 || !/[a-z]/i.test(password) || !/\d/.test(password)) {
    return { ok: false, error: "Use at least 10 characters, with a letter and a number." };
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { ok: false, error: "Your reset link has expired. Request a new one." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, error: error.message };
  return { ok: true, message: "Password updated. You can sign in with it now." };
}
