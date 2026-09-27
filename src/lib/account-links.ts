import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { EmailNotConfiguredError, linkEmail, sendEmail } from "@/lib/email";
import { platformUrl } from "@/lib/tenant";

/**
 * Account emails (confirm address, invitation, password reset) are sent by NotifyHub
 * itself rather than by Supabase's built-in mailer, which only allows a couple of
 * emails an hour. Supabase creates the one-time token; we deliver the link.
 */

type LinkKind = "signup" | "invite" | "recovery";

export type LinkResult =
  | { ok: true; userId: string; url: string }
  | { ok: false; reason: "exists" | "failed"; message?: string };

function confirmUrl(tokenHash: string, type: string, next: string) {
  const q = new URLSearchParams({ token_hash: tokenHash, type, next });
  return platformUrl(`/auth/confirm?${q.toString()}`);
}

export async function createAccountLink(
  kind: LinkKind,
  email: string,
  opts: { next: string; password?: string; name?: string },
): Promise<LinkResult> {
  const db = createAdminClient();
  const params =
    kind === "signup"
      ? { type: "signup" as const, email, password: opts.password!, options: { data: { name: opts.name } } }
      : kind === "invite"
        ? { type: "invite" as const, email, options: { data: { name: opts.name } } }
        : { type: "recovery" as const, email };
  const { data, error } = await db.auth.admin.generateLink(params);
  if (error || !data?.user || !data.properties?.hashed_token) {
    if (error && (error.code === "email_exists" || /already.*registered|exists/i.test(error.message))) return { ok: false, reason: "exists" };
    console.error("generateLink", kind, error);
    return { ok: false, reason: "failed", message: error?.message };
  }
  return { ok: true, userId: data.user.id, url: confirmUrl(data.properties.hashed_token, data.properties.verification_type, opts.next) };
}

/** Returns "sent", "not_configured" (production without email settings) or "failed". */
export async function deliverAccountLink(
  kind: LinkKind,
  to: string,
  url: string,
  ctx: { collegeName?: string; role?: string } = {},
): Promise<"sent" | "not_configured" | "failed"> {
  try {
    await sendEmail({ to, ...linkEmail(kind, url, ctx) });
    return "sent";
  } catch (err) {
    if (err instanceof EmailNotConfiguredError) return "not_configured";
    return "failed";
  }
}

/**
 * An address that signed up but never confirmed, and is not attached to any college,
 * is an abandoned attempt. Removing it lets the person start again with a new password.
 * Returns true when the address is free to use.
 */
export async function clearAbandonedSignup(email: string): Promise<{ free: boolean; confirmedUserId?: string }> {
  const db = createAdminClient();
  const { data: id } = await db.rpc("auth_user_id", { p_email: email });
  if (!id) return { free: true };
  const { data } = await db.auth.admin.getUserById(id as string);
  if (!data?.user) return { free: true };
  if (data.user.email_confirmed_at) return { free: false, confirmedUserId: data.user.id };
  const [{ count: memberships }, { count: staff }] = await Promise.all([
    db.from("admins").select("id", { count: "exact", head: true }).eq("user_id", data.user.id),
    db.from("platform_admins").select("user_id", { count: "exact", head: true }).eq("user_id", data.user.id),
  ]);
  if ((memberships ?? 0) > 0 || (staff ?? 0) > 0) return { free: false };
  const { error } = await db.auth.admin.deleteUser(data.user.id);
  if (error) {
    console.error("clearAbandonedSignup", error);
    return { free: false };
  }
  return { free: true };
}

export type InviteOutcome =
  /** Invitation email delivered. */
  | { status: "sent" }
  /** Email is not set up (or failed): the link must be shared by hand. */
  | { status: "link"; link: string }
  /** The person already has a NotifyHub account and can sign in now. */
  | { status: "existing" }
  | { status: "duplicate" }
  | { status: "failed"; error: string };

/**
 * Adds a person to a college team, creating their account when needed.
 * `insertMembership` writes the admins row (with the caller's own client, so RLS
 * applies where there is a signed-in admin) and returns the Postgres error code, if any.
 */
export async function addTeamMember(input: {
  email: string;
  name: string;
  collegeName: string;
  roleLabel: string;
  insertMembership: (userId: string) => Promise<string | null>;
}): Promise<InviteOutcome> {
  const db = createAdminClient();
  const { data: existingId } = await db.rpc("auth_user_id", { p_email: input.email });
  let userId = existingId as string | null;
  let link: string | null = null;

  if (userId) {
    // Invited before but never chose a password: give them a fresh link instead of "sign in now".
    const { data } = await db.auth.admin.getUserById(userId);
    if (data?.user && !data.user.email_confirmed_at) {
      const again = await createAccountLink("recovery", input.email, { next: "/reset-password" });
      if (again.ok) link = again.url;
    }
  } else {
    const created = await createAccountLink("invite", input.email, { name: input.name, next: "/reset-password" });
    if (!created.ok) return { status: "failed", error: "The account could not be created. Check the email address and try again." };
    userId = created.userId;
    link = created.url;
  }

  const code = await input.insertMembership(userId);
  if (code === "23505") return { status: "duplicate" };
  if (code) {
    if (!existingId) await db.auth.admin.deleteUser(userId); // do not leave an orphan account behind
    return { status: "failed", error: "The team member could not be added. Try again." };
  }
  if (!link) return { status: "existing" };

  const delivered = await deliverAccountLink("invite", input.email, link, { collegeName: input.collegeName, role: input.roleLabel });
  return delivered === "sent" ? { status: "sent" } : { status: "link", link };
}
