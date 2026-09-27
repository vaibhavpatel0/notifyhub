"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Platform staff actions. The signed-in user's client is used so the
 * "platform admins manage colleges" RLS policy is what authorises the write.
 */
export async function setCollegeStatus(fd: FormData) {
  await requirePlatformAdmin();
  const id = String(fd.get("id") ?? "");
  const op = String(fd.get("op") ?? "");
  const reason = String(fd.get("reason") ?? "").trim().slice(0, 500) || null;
  const back = String(fd.get("back") ?? "/super-admin/colleges");
  const now = new Date().toISOString();
  const supabase = await createClient();

  const { data: college } = await supabase.from("colleges").select("slug, status, published_at").eq("id", id).maybeSingle();
  if (!college) redirect(`${back}?error=not_found`);

  let patch: Record<string, unknown>;
  switch (op) {
    case "approve":
      patch = { verification_status: "verified", verified_at: now, status: college.slug ? "active" : "onboarding", published_at: college.published_at ?? (college.slug ? now : null), status_reason: null };
      break;
    case "reject":
      patch = { verification_status: "rejected", status: "rejected", status_reason: reason ?? "The college could not be verified." };
      break;
    case "suspend":
      patch = { status: "suspended", status_reason: reason ?? "Suspended by NotifyHub." };
      break;
    case "reinstate":
      patch = { status: "active", status_reason: null };
      break;
    default:
      redirect(`${back}?error=bad_op`);
  }

  const { error } = await supabase.from("colleges").update(patch).eq("id", id);
  if (error) redirect(`${back}?error=${error.code === "23505" ? "domain_taken" : "update"}`);
  if (op === "approve") {
    await createAdminClient().from("college_onboarding").update({ stage: college.slug ? 8 : 5 }).eq("college_id", id);
  }
  revalidatePath("/super-admin", "layout");
  redirect(`${back}?saved=${op}`);
}

export async function saveSettings(fd: FormData) {
  await requirePlatformAdmin();
  const supabase = await createClient();
  const rows = [
    { key: "require_manual_approval", value: fd.get("require_manual_approval") === "on" },
    { key: "accept_new_colleges", value: fd.get("accept_new_colleges") === "on" },
  ];
  for (const r of rows) {
    await supabase.from("platform_settings").update({ value: r.value, updated_at: new Date().toISOString() }).eq("key", r.key);
  }
  redirect("/super-admin/settings?saved=1");
}
