import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/platform/LoginForm";

export const metadata: Metadata = { title: "Sign in" };

const NOTICES: Record<string, string> = {
  not_platform_admin: "That account does not have NotifyHub staff access.",
  not_member: "That account is not an admin of this college.",
  link_expired: "That link has expired or was already used. Request a new one.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <div className="page-width grid gap-10 py-12 sm:py-16 md:grid-cols-[1fr_400px]">
      <div className="max-w-md">
        <h1 className="hd-1">Sign in</h1>
        <p className="lede mt-2">For college admins, department admins and NotifyHub staff.</p>
        <p className="mt-4 text-ink-2">
          Students do not need an account. Open your college&apos;s NotifyHub address to read notices.
        </p>
        <p className="mt-4 text-ink-2">
          New college? <Link href="/connect-college" className="link">Connect your college</Link>
        </p>
      </div>
      <div className="panel p-6">
        <LoginForm next={next} notice={error ? NOTICES[error] ?? null : null} forgotHref="/forgot-password" />
      </div>
    </div>
  );
}
