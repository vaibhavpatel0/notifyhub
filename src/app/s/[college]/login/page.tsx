import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LoginForm } from "@/components/platform/LoginForm";
import { CollegeMark } from "@/components/portal/CollegeMark";
import { LogoMark } from "@/components/ui/Logo";
import { getPortalStatus, getPublicCollege } from "@/lib/data";
import { platformUrl, portalPath } from "@/lib/tenant";

export const metadata: Metadata = { title: "Admin sign-in", robots: { index: false } };

const NOTICES: Record<string, string> = {
  not_member: "That account is not an admin of this college. Sign in with the account your college admin invited.",
};

export default async function TenantLogin({ params, searchParams }: { params: Promise<{ college: string }>; searchParams: Promise<{ next?: string; error?: string }> }) {
  const [{ college: slug }, { next, error }] = await Promise.all([params, searchParams]);
  const status = await getPortalStatus(slug);
  if (!status || status === "rejected") notFound();
  const college = await getPublicCollege(slug);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-12" style={{ ["--tenant" as string]: college?.brand_color ?? "#1f4e8c" }}>
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3">
          {college ? <CollegeMark name={college.name} shortName={college.short_name} logoUrl={college.logo_url} size={44} /> : null}
          <div>
            <p className="font-extrabold leading-tight">{college?.name ?? slug}</p>
            <p className="text-[0.875rem] text-ink-2">Admin sign-in</p>
          </div>
        </div>
        <div className="panel mt-6 p-6">
          <LoginForm
            college={slug}
            next={next && next.startsWith("/") && !next.startsWith("//") ? next : portalPath(slug, "/admin")}
            notice={error ? NOTICES[error] ?? null : null}
            forgotHref={platformUrl("/forgot-password")}
          />
        </div>
        <p className="mt-6 text-center text-[0.875rem] text-ink-3">
          Students do not need to sign in.{" "}
          {college ? <a href={portalPath(slug, "/")} className="font-bold text-ink-2 underline underline-offset-2">Go to the portal</a> : null}
        </p>
        <p className="mt-8 flex items-center justify-center gap-2 text-[0.8125rem] text-ink-3">
          <LogoMark size={16} /> NotifyHub
        </p>
      </div>
    </main>
  );
}
