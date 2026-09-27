import { PasswordForm } from "@/components/admin/PasswordForm";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusPill } from "@/components/ui/Badges";
import { requireCollegeMember } from "@/lib/auth";
import { SUPPORT_EMAIL } from "@/lib/env";
import { formatDate } from "@/lib/format";
import { portalHost } from "@/lib/tenant";

export const metadata = { title: "Settings" };

const METHOD: Record<string, string> = { email_otp: "Official email code", dns_txt: "DNS record", html_meta: "Website tag", manual: "Manual review" };

export default async function SettingsPage({ params }: { params: Promise<{ college: string }> }) {
  const { college: slug } = await params;
  const ctx = await requireCollegeMember(slug);
  const c = ctx.college;
  return (
    <div className="space-y-8">
      <PageHeader title="Settings" />
      <section className="panel max-w-2xl">
        <h2 className="hd-3 border-b border-line px-5 py-3">Your account</h2>
        <dl className="divide-y divide-line text-[0.9375rem]">
          <Row label="Name">{ctx.member.name}</Row>
          <Row label="Email">{ctx.email}</Row>
          <Row label="Role">{ctx.isCollegeAdmin ? "College admin" : `Department admin, ${ctx.member.department?.name ?? ""}`}</Row>
        </dl>
      </section>
      <PasswordForm slug={slug} />
      <section className="panel max-w-2xl">
        <h2 className="hd-3 border-b border-line px-5 py-3">Portal</h2>
        <dl className="divide-y divide-line text-[0.9375rem]">
          <Row label="Address">{portalHost(slug)}</Row>
          <Row label="Status"><StatusPill status={c.status} /></Row>
          <Row label="Verification">
            <StatusPill status={c.verification_status} />
            {c.verification_method ? <span className="ml-2 text-ink-2">{METHOD[c.verification_method] ?? c.verification_method}</span> : null}
            {c.verified_at ? <span className="ml-2 text-ink-3">{formatDate(c.verified_at, c.timezone)}</span> : null}
          </Row>
          <Row label="Official website">{c.official_website}</Row>
        </dl>
        <p className="border-t border-line px-5 py-3 text-[0.875rem] text-ink-2">
          To change the portal address or official website, email <a className="link" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </section>
      <section className="panel max-w-2xl p-5">
        <h2 className="hd-3">Notifications</h2>
        <p className="mt-1 text-[0.9375rem] text-ink-2">
          You receive in-app notifications (the bell at the top) when a department posts and when your portal&apos;s status changes. Email and push notifications are planned.
        </p>
      </section>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 px-5 py-3 sm:grid-cols-[160px_1fr]">
      <dt className="font-bold text-ink-3">{label}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  );
}
