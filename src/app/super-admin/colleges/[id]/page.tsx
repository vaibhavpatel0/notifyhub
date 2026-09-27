import { notFound } from "next/navigation";
import { StaffFlash } from "@/components/admin/CollegeTable";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { StatusPill } from "@/components/ui/Badges";
import { setCollegeStatus } from "@/lib/actions/super";
import { formatDateTime } from "@/lib/format";
import { STAGES } from "@/lib/onboarding/state";
import { createClient } from "@/lib/supabase/server";
import { portalHost, portalUrl } from "@/lib/tenant";
import type { College } from "@/lib/types";

export const metadata = { title: "College" };

export default async function CollegeDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: c }, { data: ob }, { data: analysis }, { data: admins }, { data: tokens }, { data: counts }] = await Promise.all([
    supabase.from("colleges").select("*").eq("id", id).maybeSingle(),
    supabase.from("college_onboarding").select("*").eq("college_id", id).maybeSingle(),
    supabase.from("website_analysis").select("status, detected_name, detected_email, detected_departments, analysis_result, created_at").eq("college_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("admins").select("name, email, role, status").eq("college_id", id),
    supabase.from("verification_tokens").select("email, verified, attempts, created_at").eq("college_id", id).order("created_at", { ascending: false }).limit(5),
    supabase.rpc("college_analytics", { p_college: id }),
  ]);
  if (!c) notFound();
  const college = c as College;
  const back = `/super-admin/colleges/${id}`;
  const result = analysis?.analysis_result as { officialEmails?: string[]; phones?: string[]; address?: string; pagesVisited?: string[] } | undefined;
  const stats = counts as Record<string, number> | null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="hd-1">{college.name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-ink-2">
            <StatusPill status={college.status} /> <StatusPill status={college.verification_status} />
            {college.slug ? (college.status === "active" ? <a className="link" href={portalUrl(college.slug)} target="_blank" rel="noopener">{portalHost(college.slug)}</a> : <span>{portalHost(college.slug)}</span>) : null}
          </p>
        </div>
      </div>
      <StaffFlash saved={sp.saved} error={sp.error} />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Panel title="College">
            <Row label="Official website"><a className="link break-all" href={college.official_website} target="_blank" rel="noopener noreferrer">{college.official_website}</a></Row>
            <Row label="Domain">{college.website_domain}</Row>
            <Row label="Verified email">{college.official_email ?? "None"}</Row>
            <Row label="Method">{college.verification_method ?? "None yet"}</Row>
            <Row label="Created">{formatDateTime(college.created_at)}</Row>
            {college.status_reason ? <Row label="Status note">{college.status_reason}</Row> : null}
            {stats ? <Row label="Content">{stats.total_announcements} announcements, {stats.departments} departments, {stats.total_views} views</Row> : null}
          </Panel>
          {ob ? (
            <Panel title="Onboarding request">
              <Row label="Stage">{ob.stage}. {STAGES[ob.stage - 1]}</Row>
              <Row label="Contact">{ob.contact_name}, {ob.contact_email}{ob.contact_phone ? `, ${ob.contact_phone}` : ""}</Row>
              {ob.verification_email ? <Row label="Code sent to">{ob.verification_email}</Row> : null}
              {ob.review_note ? <Row label="Note for reviewer"><span className="whitespace-pre-line">{ob.review_note}</span></Row> : null}
            </Panel>
          ) : null}
          {analysis ? (
            <Panel title="Website analysis (unverified)">
              <Row label="Result">{analysis.status}, {formatDateTime(analysis.created_at)}</Row>
              <Row label="Detected name">{analysis.detected_name ?? "None"}</Row>
              <Row label="Emails on website">{result?.officialEmails?.join(", ") || "None on the college domain"}</Row>
              <Row label="Phones on website">{result?.phones?.join(", ") || "None"}</Row>
              <Row label="Address">{result?.address ?? "None"}</Row>
              <Row label="Departments">{analysis.detected_departments?.join(", ") || "None"}</Row>
              <Row label="Pages read">{result?.pagesVisited?.length ?? 0}</Row>
            </Panel>
          ) : null}
          {tokens?.length ? (
            <Panel title="Verification codes">
              {tokens.map((t, i) => (
                <Row key={i} label={formatDateTime(t.created_at)}>{t.email}: {t.verified ? "verified" : `not verified, ${t.attempts} wrong attempts`}</Row>
              ))}
            </Panel>
          ) : null}
          <Panel title="Admins">
            {admins?.length ? admins.map((a) => <Row key={a.email} label={a.role === "college_admin" ? "College admin" : "Department admin"}>{a.name}, {a.email} ({a.status})</Row>) : <p className="px-5 py-3 text-ink-3">No admin account yet.</p>}
          </Panel>
        </div>

        <aside className="space-y-4">
          <div className="panel space-y-3 p-5">
            <h2 className="hd-3">Actions</h2>
            {college.verification_status !== "verified" && college.status !== "rejected" ? (
              <Action id={id} back={back} op="approve" label="Approve and publish" className="btn-primary w-full" confirm="Approve this college? Its portal becomes public." />
            ) : null}
            {college.status === "active" ? <Action id={id} back={back} op="suspend" label="Suspend portal" className="btn-danger w-full" confirm="Suspend this portal? It goes offline immediately." withReason /> : null}
            {college.status === "suspended" ? <Action id={id} back={back} op="reinstate" label="Reinstate portal" className="btn-secondary w-full" confirm="Reinstate this portal?" /> : null}
            {college.status !== "rejected" && college.verification_status !== "verified" ? (
              <Action id={id} back={back} op="reject" label="Reject registration" className="btn-danger w-full" confirm="Reject this registration?" withReason />
            ) : null}
          </div>
          <p className="text-[0.8125rem] text-ink-3">Every action is recorded in the activity log and the college admins are notified in-app.</p>
        </aside>
      </div>
    </div>
  );
}

function Action({ id, back, op, label, className, confirm, withReason }: { id: string; back: string; op: string; label: string; className: string; confirm: string; withReason?: boolean }) {
  return (
    <form action={setCollegeStatus} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="op" value={op} />
      <input type="hidden" name="back" value={back} />
      {withReason ? <textarea name="reason" className="input min-h-16 text-[0.875rem]" placeholder="Reason (shown to the college admins)" maxLength={500} /> : null}
      <ConfirmSubmit message={confirm} className={className}>{label}</ConfirmSubmit>
    </form>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel">
      <h2 className="hd-3 border-b border-line px-5 py-3">{title}</h2>
      <dl className="divide-y divide-line text-[0.9375rem]">{children}</dl>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 px-5 py-2.5 sm:grid-cols-[170px_1fr]">
      <dt className="font-bold text-ink-3">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}
