"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { platformUrl, portalHost, portalUrl } from "@/lib/tenant";
import type { ActionResult } from "@/lib/types";
import { STORAGE_BUCKET } from "@/lib/constants";
import { EMAIL_RE, emailMatchesDomain, isFreeMail, normaliseWebsiteUrl, registrableDomain } from "@/lib/onboarding/domain";
import { clearSession, getOnboarding, startSession, type OnboardingRecord } from "@/lib/onboarding/session";
import { isAllowedSlug, slugCandidates, slugify } from "@/lib/onboarding/slug";
import { checkDnsVerification, checkMetaVerification, DNS_RECORD_HOST, DNS_RECORD_VALUE, META_TAG } from "@/lib/onboarding/verify";
import { generateOtp, hashOtp, OTP_MAX_ATTEMPTS, OTP_RESEND_SECONDS, OTP_TTL_MINUTES, otpMatches } from "@/lib/otp";
import { EmailNotConfiguredError, otpEmail as buildOtpEmail, sendEmail } from "@/lib/email";
import { safeFetchBytes } from "@/lib/onboarding/safe-fetch";
import type { WizardState } from "@/lib/onboarding/state";

const GENERIC_ERROR = "Something went wrong on our side. Your progress is saved; please try again.";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

function toWizardState(r: OnboardingRecord): WizardState {
  const a = r.analysis;
  const published = r.college.status === "active";
  return {
    stage: r.onboarding.stage,
    college: {
      name: r.college.name,
      shortName: r.college.short_name,
      website: r.college.official_website,
      domain: r.college.website_domain,
      description: r.college.description,
      address: r.college.address,
      phone: r.college.phone,
      officialEmail: r.college.official_email,
      slug: r.college.slug,
      status: r.college.status,
      verificationStatus: r.college.verification_status,
      verificationMethod: r.college.verification_method,
    },
    contact: { name: r.onboarding.contact_name, email: r.onboarding.contact_email, phone: r.onboarding.contact_phone },
    analysis: a
      ? {
          status: a.status, name: a.name, description: a.description, logo: a.logo, address: a.address, phones: a.phones,
          emails: a.emails, officialEmails: a.officialEmails, departments: a.departments, pagesVisited: a.pagesVisited, error: a.error,
        }
      : null,
    verification: {
      email: r.onboarding.verification_email,
      dnsHost: DNS_RECORD_HOST(r.college.website_domain),
      dnsValue: DNS_RECORD_VALUE(r.onboarding.verification_token),
      metaTag: META_TAG(r.onboarding.verification_token),
    },
    departments: r.onboarding.pending_departments ?? [],
    portal:
      r.college.slug && r.onboarding.stage >= 7
        ? { url: portalUrl(r.college.slug), host: portalHost(r.college.slug), adminUrl: portalUrl(r.college.slug, "/admin"), published }
        : null,
  };
}

export async function loadOnboardingState(): Promise<WizardState | null> {
  const r = await getOnboarding();
  return r ? toWizardState(r) : null;
}

async function requireOnboarding(allowedStages: number[]): Promise<OnboardingRecord | { error: string }> {
  const r = await getOnboarding();
  if (!r) return { error: "Your onboarding session has expired. Start again with your college's website." };
  if (!allowedStages.includes(r.onboarding.stage)) {
    return { error: "This step is already complete. Refresh the page to continue where you left off." };
  }
  return r;
}

async function stateResult(message?: string): Promise<ActionResult<WizardState>> {
  const r = await getOnboarding();
  if (!r) return { ok: false, error: GENERIC_ERROR };
  return { ok: true, data: toWizardState(r), message };
}

async function setting<T>(key: string, fallback: T): Promise<T> {
  const { data } = await createAdminClient().from("platform_settings").select("value").eq("key", key).maybeSingle();
  return (data?.value as T | undefined) ?? fallback;
}

// ---------------------------------------------------------------------------
// Step 1: website submitted
// ---------------------------------------------------------------------------

const startSchema = z.object({
  collegeName: z.string().trim().min(3, "Enter the college's full name").max(200),
  website: z.string().trim().min(4, "Enter the official website address"),
  contactName: z.string().trim().min(2, "Enter your name").max(120),
  contactEmail: z.string().trim().toLowerCase().regex(EMAIL_RE, "Enter a valid email address"),
  contactPhone: z
    .string()
    .trim()
    .max(20)
    .regex(/^[+\d][\d\s-]{6,19}$/, "Enter a valid phone number")
    .or(z.literal("")),
});

export async function startOnboarding(_prev: unknown, formData: FormData): Promise<ActionResult<WizardState>> {
  const parsed = startSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { ok: false, error: "Check the highlighted fields.", fieldErrors };
  }
  const input = parsed.data;
  const url = normaliseWebsiteUrl(input.website);
  if (!url) return { ok: false, error: "Check the highlighted fields.", fieldErrors: { website: "Enter a full website address, for example https://www.yourcollege.ac.in" } };
  const domain = registrableDomain(url.hostname);
  if (!domain) return { ok: false, error: "Check the highlighted fields.", fieldErrors: { website: "This does not look like a public website address" } };

  try {
    if (!(await setting("accept_new_colleges", true))) {
      return { ok: false, error: "NotifyHub is not accepting new colleges right now. Please contact us." };
    }
    const db = createAdminClient();
    const { data: existing } = await db
      .from("colleges")
      .select("name, slug")
      .eq("website_domain", domain)
      .eq("verification_status", "verified")
      .maybeSingle();
    if (existing) {
      return {
        ok: false,
        error: `${existing.name} is already connected to NotifyHub${existing.slug ? ` at ${portalHost(existing.slug)}` : ""}. If you manage it, sign in there. Otherwise contact support.`,
      };
    }

    const { data: college, error } = await db
      .from("colleges")
      .insert({ name: input.collegeName, official_website: url.toString(), website_domain: domain, status: "onboarding" })
      .select("id")
      .single();
    if (error || !college) throw error;

    const sessionHash = await startSession(college.id);
    const { error: e2 } = await db.from("college_onboarding").insert({
      college_id: college.id,
      session_hash: sessionHash,
      contact_name: input.contactName,
      contact_email: input.contactEmail,
      contact_phone: input.contactPhone || null,
      stage: 1,
    });
    if (e2) throw e2;
    return stateResult();
  } catch (err) {
    console.error("startOnboarding", err);
    return { ok: false, error: GENERIC_ERROR };
  }
}

// ---------------------------------------------------------------------------
// Step 3: details reviewed
// ---------------------------------------------------------------------------

const reviewSchema = z.object({
  name: z.string().trim().min(3).max(200),
  shortName: z.string().trim().max(20).optional().default(""),
  description: z.string().trim().max(600).optional().default(""),
  address: z.string().trim().max(400).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
  departments: z.array(z.object({ code: z.string().trim().min(1).max(12), name: z.string().trim().min(2).max(120) })).max(40),
});

export async function saveReviewedDetails(input: z.input<typeof reviewSchema>): Promise<ActionResult<WizardState>> {
  const r = await requireOnboarding([1, 2, 3, 4]);
  if ("error" in r) return { ok: false, error: r.error };
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the college name and department names." };
  const v = parsed.data;
  try {
    const db = createAdminClient();
    await db
      .from("colleges")
      .update({
        name: v.name,
        short_name: v.shortName || null,
        description: v.description || null,
        address: v.address || null,
        phone: v.phone || null,
        welcome_heading: `Welcome to ${v.name}`,
      })
      .eq("id", r.college.id);
    await db
      .from("college_onboarding")
      .update({ stage: 3, pending_departments: v.departments, detected_logo: r.analysis?.logo ?? null })
      .eq("college_id", r.college.id);
    return stateResult();
  } catch (err) {
    console.error("saveReviewedDetails", err);
    return { ok: false, error: GENERIC_ERROR };
  }
}

// ---------------------------------------------------------------------------
// Step 4: email one-time code
// ---------------------------------------------------------------------------

export async function sendVerificationCode(emailInput: string): Promise<ActionResult<{ devLogged: boolean; state: WizardState }>> {
  const r = await requireOnboarding([3, 4]);
  if ("error" in r) return { ok: false, error: r.error };
  const email = emailInput.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Enter a valid email address." };
  if (isFreeMail(email) || !emailMatchesDomain(email, r.college.website_domain)) {
    return {
      ok: false,
      error: `Use an address ending in @${r.college.website_domain}. Personal mailboxes such as Gmail cannot prove the college's ownership; use DNS, website tag or manual review instead.`,
    };
  }

  const db = createAdminClient();
  const { data: recent } = await db
    .from("verification_tokens")
    .select("created_at")
    .eq("college_id", r.college.id)
    .gte("created_at", new Date(Date.now() - 3600_000).toISOString())
    .order("created_at", { ascending: false });
  if (recent?.length && Date.now() - new Date(recent[0]!.created_at).getTime() < OTP_RESEND_SECONDS * 1000) {
    return { ok: false, error: `Please wait a minute before requesting another code.` };
  }
  if ((recent?.length ?? 0) >= 5) {
    return { ok: false, error: "Too many codes requested in the last hour. Try again later, or choose another verification method." };
  }

  try {
    const code = generateOtp();
    const { error } = await db.from("verification_tokens").insert({
      college_id: r.college.id,
      email,
      otp_hash: hashOtp(code, `${r.college.id}:${email}`),
      expires_at: new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString(),
    });
    if (error) throw error;
    const msg = buildOtpEmail(code, r.college.name);
    const sent = await sendEmail({ to: email, ...msg });
    await db.from("college_onboarding").update({ stage: 4, verification_email: email }).eq("college_id", r.college.id);
    const state = await stateResult();
    if (!state.ok || !state.data) return { ok: false, error: GENERIC_ERROR };
    return { ok: true, data: { devLogged: Boolean(sent.devLogged), state: state.data }, message: `We sent a 6-digit code to ${email}.` };
  } catch (err) {
    console.error("sendVerificationCode", err);
    if (err instanceof EmailNotConfiguredError) {
      return { ok: false, error: "Email codes are not available yet. Verify with the DNS record, the website tag or manual review instead." };
    }
    return { ok: false, error: "We could not send the code. Check the address, or try another verification method." };
  }
}

export async function verifyCode(codeInput: string): Promise<ActionResult<WizardState>> {
  const r = await requireOnboarding([4]);
  if ("error" in r) return { ok: false, error: r.error };
  const code = codeInput.replace(/\D/g, "");
  const email = r.onboarding.verification_email;
  if (code.length !== 6 || !email) return { ok: false, error: "Enter the 6-digit code from the email." };

  const db = createAdminClient();
  const { data: token } = await db
    .from("verification_tokens")
    .select("id, otp_hash, attempts, expires_at, verified")
    .eq("college_id", r.college.id)
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!token) return { ok: false, error: "Request a code first." };
  if (token.verified) return { ok: false, error: "This code was already used. Request a new one." };
  if (new Date(token.expires_at).getTime() < Date.now()) return { ok: false, error: "This code has expired. Request a new one." };
  if (token.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, error: "Too many incorrect attempts. Request a new code." };

  if (!otpMatches(code, `${r.college.id}:${email}`, token.otp_hash)) {
    await db.from("verification_tokens").update({ attempts: token.attempts + 1 }).eq("id", token.id);
    const left = OTP_MAX_ATTEMPTS - token.attempts - 1;
    return { ok: false, error: left > 0 ? `That code is not correct. ${left} ${left === 1 ? "attempt" : "attempts"} left.` : "Too many incorrect attempts. Request a new code." };
  }

  await db.from("verification_tokens").update({ verified: true, verified_at: new Date().toISOString() }).eq("id", token.id);

  // An address the college itself publishes on its official website counts as
  // proof of ownership. Any other address on the domain (for example a staff or
  // student mailbox) proves domain access only, so NotifyHub staff review it.
  const listedOnSite = (r.analysis?.officialEmails ?? []).includes(email);
  const result = await markVerified(r, listedOnSite ? "verified" : "manual_review", "email_otp", email, listedOnSite ? null : `Verified ${email}, which is not listed on the college website.`);
  if (!result.ok) return result;
  return stateResult(listedOnSite ? "Email verified. College ownership confirmed." : "Email verified. Because this address is not listed on your website, a NotifyHub reviewer will confirm the college before the portal goes public.");
}

// ---------------------------------------------------------------------------
// Alternative verification: DNS TXT record, website meta tag, manual review
// ---------------------------------------------------------------------------

export async function checkOwnership(method: "dns" | "meta"): Promise<ActionResult<WizardState>> {
  const r = await requireOnboarding([3, 4]);
  if ("error" in r) return { ok: false, error: r.error };
  const token = r.onboarding.verification_token;
  const found =
    method === "dns"
      ? await checkDnsVerification(r.college.website_domain, token)
      : await checkMetaVerification(r.college.official_website, token);
  if (!found) {
    return {
      ok: false,
      error:
        method === "dns"
          ? `We could not find the TXT record at ${DNS_RECORD_HOST(r.college.website_domain)} yet. DNS changes can take up to an hour; check again later.`
          : "We could not find the verification tag on your home page. Make sure it is inside <head> on the published site, then check again.",
    };
  }
  const result = await markVerified(r, "verified", method === "dns" ? "dns_txt" : "html_meta", null, null);
  if (!result.ok) return result;
  return stateResult("Ownership confirmed.");
}

export async function requestManualReview(note: string): Promise<ActionResult<WizardState>> {
  const r = await requireOnboarding([3, 4]);
  if ("error" in r) return { ok: false, error: r.error };
  const clean = note.trim().slice(0, 1000);
  if (clean.length < 20) return { ok: false, error: "Tell the reviewer your role at the college and how we can confirm it (at least 20 characters)." };
  const result = await markVerified(r, "manual_review", "manual", null, clean);
  if (!result.ok) return result;
  return stateResult("Sent for manual review. You can finish setting up now; the portal goes public once a reviewer approves it.");
}

async function markVerified(
  r: OnboardingRecord,
  status: "verified" | "manual_review",
  method: "email_otp" | "dns_txt" | "html_meta" | "manual",
  email: string | null,
  note: string | null,
): Promise<ActionResult<never>> {
  const db = createAdminClient();
  const { error } = await db
    .from("colleges")
    .update({
      verification_status: status,
      verification_method: method,
      verified_at: status === "verified" ? new Date().toISOString() : null,
      ...(email ? { official_email: email } : {}),
    })
    .eq("id", r.college.id);
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Another account has already verified this college's domain. Contact NotifyHub support if you believe this is a mistake." };
    }
    console.error("markVerified", error);
    return { ok: false, error: GENERIC_ERROR };
  }
  await db.from("college_onboarding").update({ stage: 5, review_note: note }).eq("college_id", r.college.id);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Step 6: subdomain
// ---------------------------------------------------------------------------

async function takenSlugs(candidates: string[]) {
  if (!candidates.length) return new Set<string>();
  const { data } = await createAdminClient().from("colleges").select("slug").in("slug", candidates);
  return new Set((data ?? []).map((d) => d.slug as string));
}

export async function suggestSlugs(): Promise<ActionResult<{ suggestions: string[]; takenPreferred: string | null }>> {
  const r = await requireOnboarding([5, 6]);
  if ("error" in r) return { ok: false, error: r.error };
  let candidates = slugCandidates(r.college.name, { shortName: r.college.short_name, websiteUrl: r.college.official_website });
  if (r.college.slug) candidates = [r.college.slug, ...candidates.filter((c) => c !== r.college.slug)];
  const taken = await takenSlugs(candidates);
  if (r.college.slug) taken.delete(r.college.slug); // our own reservation
  let available = candidates.filter((c) => !taken.has(c));
  if (available.length < 3 && candidates[0]) {
    const numbered = [2, 3, 4, 5, 6].map((n) => `${candidates[0]}${n}`);
    const t2 = await takenSlugs(numbered);
    available = [...available, ...numbered.filter((n) => !t2.has(n))];
  }
  return {
    ok: true,
    data: { suggestions: available.slice(0, 5), takenPreferred: candidates[0] && taken.has(candidates[0]) ? candidates[0] : null },
  };
}

export async function checkSlugAvailability(input: string): Promise<{ slug: string; available: boolean; reason?: string }> {
  const slug = slugify(input);
  if (!slug || slug.length < 2) return { slug, available: false, reason: "Use at least 2 letters or numbers." };
  if (!isAllowedSlug(slug)) return { slug, available: false, reason: "This address is reserved." };
  const supabase = await createClient();
  const { data } = await supabase.rpc("slug_available", { p_slug: slug });
  if (data) return { slug, available: true };
  const r = await getOnboarding();
  if (r?.college.slug === slug) return { slug, available: true };
  return { slug, available: false, reason: "Already taken." };
}

export async function chooseSlug(input: string): Promise<ActionResult<WizardState>> {
  const r = await requireOnboarding([5, 6]);
  if ("error" in r) return { ok: false, error: r.error };
  const slug = slugify(input);
  if (!isAllowedSlug(slug)) return { ok: false, error: "Choose an address using lowercase letters, numbers and hyphens (2 to 40 characters)." };
  const db = createAdminClient();
  const { error } = await db.from("colleges").update({ slug }).eq("id", r.college.id);
  if (error) {
    if (error.code === "23505") return { ok: false, error: `${slug} was just taken. Pick another address.` };
    console.error("chooseSlug", error);
    return { ok: false, error: GENERIC_ERROR };
  }
  await db.from("college_onboarding").update({ stage: 6 }).eq("college_id", r.college.id);
  return stateResult();
}

// ---------------------------------------------------------------------------
// Step 7 and 8: admin account, then publish
// ---------------------------------------------------------------------------

const accountSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(120),
  email: z.string().trim().toLowerCase().regex(EMAIL_RE, "Enter a valid email address"),
  password: z
    .string()
    .min(10, "Use at least 10 characters")
    .max(72)
    .regex(/[a-zA-Z]/, "Include at least one letter")
    .regex(/[0-9]/, "Include at least one number"),
});

export async function createCollegeAccount(_prev: unknown, formData: FormData): Promise<ActionResult<WizardState>> {
  const r = await requireOnboarding([6]);
  if ("error" in r) return { ok: false, error: r.error };
  if (!r.college.slug) return { ok: false, error: "Choose your portal address first." };
  const parsed = accountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { ok: false, error: "Check the highlighted fields.", fieldErrors };
  }
  const { name, email, password } = parsed.data;
  const db = createAdminClient();
  const supabase = await createClient();

  // 1. Auth user. If the email was verified by one-time code in this flow, it is confirmed already.
  const emailAlreadyVerified = r.college.verification_method === "email_otp" && r.onboarding.verification_email === email;
  let userId: string | null = null;
  let needsEmailConfirmation = false;

  if (emailAlreadyVerified) {
    const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } });
    if (data?.user) userId = data.user.id;
    else if (error && !/already.*registered|exists/i.test(error.message)) {
      console.error("createUser", error);
      return { ok: false, error: GENERIC_ERROR };
    }
  } else {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name }, emailRedirectTo: platformUrl(`/auth/callback?next=${encodeURIComponent(portalUrl(r.college.slug, "/admin"))}`) },
    });
    if (error && !/already.*registered|exists/i.test(error.message)) {
      return { ok: false, error: error.message.includes("password") ? error.message : GENERIC_ERROR };
    }
    // Supabase returns a user with no identities for an address that already has an account.
    if (data?.user && (data.user.identities?.length ?? 0) > 0) {
      userId = data.user.id;
      needsEmailConfirmation = !data.session;
    }
  }

  if (!userId) {
    // Existing NotifyHub account (for example an admin of another college): prove it with its password.
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      return {
        ok: false,
        error: "An account with this email already exists. Enter that account's current password to link this college, or use another email.",
        fieldErrors: { password: "Password for the existing account" },
      };
    }
    userId = data.user.id;
  } else if (emailAlreadyVerified) {
    await supabase.auth.signInWithPassword({ email, password });
  }

  // 2. College admin membership.
  const { error: memberError } = await db
    .from("admins")
    .upsert({ college_id: r.college.id, user_id: userId, name, email, role: "college_admin", department_id: null, status: "active" }, { onConflict: "college_id,user_id" });
  if (memberError) {
    console.error("admins insert", memberError);
    return { ok: false, error: GENERIC_ERROR };
  }

  // 3. Departments picked during review.
  const depts = r.onboarding.pending_departments ?? [];
  if (depts.length) {
    const used = new Set<string>();
    const rows = depts.map((d, i) => {
      let slug = slugify(d.code) || slugify(d.name);
      while (used.has(slug)) slug = `${slug}-${i}`;
      used.add(slug);
      return { college_id: r.college.id, name: d.name, code: d.code.toUpperCase().slice(0, 12), slug, sort_order: i + 1 };
    });
    const { error } = await db.from("departments").upsert(rows, { onConflict: "college_id,slug", ignoreDuplicates: true });
    if (error) console.error("departments insert", error);
  }

  // 4. Best effort: copy the detected logo into our own storage rather than hot-linking.
  if (r.onboarding.detected_logo) {
    const logoUrl = await importLogo(r.college.id, r.onboarding.detected_logo);
    if (logoUrl) await db.from("colleges").update({ logo_url: logoUrl }).eq("id", r.college.id);
  }

  // 5. Publish, or hold for review.
  const requireApproval = await setting("require_manual_approval", false);
  const autoPublish = r.college.verification_status === "verified" && !requireApproval;
  await db
    .from("colleges")
    .update(
      autoPublish
        ? { status: "active", published_at: new Date().toISOString() }
        : { status: "pending_review" },
    )
    .eq("id", r.college.id);
  await db.from("college_onboarding").update({ stage: autoPublish ? 8 : 7 }).eq("college_id", r.college.id);

  return stateResult(
    needsEmailConfirmation
      ? `Account created. Confirm your email from the message we sent to ${email}, then sign in at ${portalHost(r.college.slug)}/login.`
      : undefined,
  );
}

async function importLogo(collegeId: string, url: string): Promise<string | null> {
  try {
    const res = await safeFetchBytes(url, { accept: "image/png,image/jpeg,image/webp,image/gif", maxBytes: 2_000_000 });
    const type = res.contentType.split(";")[0]!.trim();
    if (res.status >= 400 || res.truncated || !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(type)) return null;
    const ext = type.split("/")[1]!.replace("jpeg", "jpg");
    const path = `${collegeId}/logo/imported-${Date.now()}.${ext}`;
    const db = createAdminClient();
    const { error } = await db.storage.from(STORAGE_BUCKET).upload(path, res.bytes, { contentType: type });
    if (error) return null;
    return db.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Cancel: throw away an unfinished registration and release its address
// ---------------------------------------------------------------------------

export async function cancelOnboarding(): Promise<ActionResult> {
  const r = await getOnboarding();
  if (r && r.onboarding.stage < 7 && r.college.status === "onboarding") {
    // Deleting the draft college removes its onboarding record, analysis, codes and reserved address.
    const { error } = await createAdminClient().from("colleges").delete().eq("id", r.college.id).eq("status", "onboarding");
    if (error) {
      console.error("cancelOnboarding", error);
      return { ok: false, error: GENERIC_ERROR };
    }
  }
  await clearSession();
  return { ok: true };
}
