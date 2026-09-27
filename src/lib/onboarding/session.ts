import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AnalysisResult } from "./analyzer";

/**
 * Onboarding happens before the college has an account, so progress is tied
 * to the browser with an httpOnly cookie "<collegeId>.<random token>". Only a
 * SHA-256 of the token is stored. All onboarding reads and writes go through
 * the service-role client after this check; the tables have no public policies.
 */
const COOKIE = "nh_onboarding";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export async function startSession(collegeId: string) {
  const token = randomBytes(32).toString("base64url");
  const store = await cookies();
  store.set(COOKIE, `${collegeId}.${token}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 3600,
  });
  return sha256(token);
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

export interface OnboardingRecord {
  college: {
    id: string;
    name: string;
    short_name: string | null;
    slug: string | null;
    official_website: string;
    website_domain: string;
    official_email: string | null;
    description: string | null;
    address: string | null;
    phone: string | null;
    status: string;
    verification_status: string;
    verification_method: string | null;
  };
  onboarding: {
    stage: number;
    contact_name: string;
    contact_email: string;
    contact_phone: string | null;
    verification_email: string | null;
    verification_token: string;
    pending_departments: { code: string; name: string }[];
    detected_logo: string | null;
    review_note: string | null;
    expires_at: string;
  };
  analysis: AnalysisResult | null;
}

/** Loads the onboarding record for this browser, or null if there is none / it expired. */
export async function getOnboarding(): Promise<OnboardingRecord | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [collegeId, token] = raw.split(".");
  if (!collegeId || !token || !/^[0-9a-f-]{36}$/.test(collegeId)) return null;

  const db = createAdminClient();
  const { data } = await db
    .from("college_onboarding")
    .select(
      "stage, session_hash, contact_name, contact_email, contact_phone, verification_email, verification_token, pending_departments, detected_logo, review_note, expires_at, " +
        "college:colleges(id, name, short_name, slug, official_website, website_domain, official_email, description, address, phone, status, verification_status, verification_method)",
    )
    .eq("college_id", collegeId)
    .maybeSingle();
  if (!data) return null;
  const row = data as unknown as OnboardingRecord["onboarding"] & { session_hash: string; college: OnboardingRecord["college"] };
  if (row.session_hash !== sha256(token)) return null;
  if (new Date(row.expires_at).getTime() < Date.now() && row.stage < 7) return null;

  const { data: analysis } = await db
    .from("website_analysis")
    .select("analysis_result")
    .eq("college_id", collegeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { session_hash: _hash, college, ...onboarding } = row;
  void _hash;
  return { college, onboarding, analysis: (analysis?.analysis_result as AnalysisResult | undefined) ?? null };
}
