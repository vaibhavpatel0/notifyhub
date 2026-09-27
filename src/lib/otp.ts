import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_SECONDS = 60;

function secret() {
  // Falls back to the integration-provided JWT secret, which is server-only as well.
  const s = process.env.OTP_SECRET || process.env.SUPABASE_JWT_SECRET;
  if (!s || s.length < 16) throw new Error("OTP_SECRET must be set (16+ characters)");
  return s;
}

export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashOtp(otp: string, scope: string): string {
  return createHmac("sha256", secret()).update(`${scope}:${otp}`).digest("hex");
}

export function otpMatches(otp: string, scope: string, expectedHash: string): boolean {
  const a = Buffer.from(hashOtp(otp, scope), "hex");
  const b = Buffer.from(expectedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
