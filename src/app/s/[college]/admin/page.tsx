import Link from "next/link";
import { Check, Circle, ImagePlus } from "lucide-react";
import { StatRow } from "@/components/admin/StatRow";
import { Flash } from "@/components/admin/PageHeader";
import { StatusPill, UrgentBadge } from "@/components/ui/Badges";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireCollegeMember } from "@/lib/auth";
import { eventState, noticeState } from "@/lib/content-status";
import { formatDate, formatDateTime, requestTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { portalPath } from "@/lib/tenant";

export default async function AdminDashboard({ params, searchParams }: { params: Promise<{ college: string }>; searchParams: Promise<{ error?: string }> }) {
  const [{ college: slug }, { error }] = await Promise.all([params, searchParams]);
  const ctx = await requireCollegeMember(slug);
  const p = (path: string) => portalPath(slug, path);
  const supabase = await createClient();

  let annQ = supabase.from("announcements").select("id, title, status, is_urgent, published_at, expires_at, department:departments(code)").eq("college_id", ctx.college.id).order("created_at", { ascending: false }).limit(6);
  let evQ = supabase.from("events").select("id, title, status, starts_at, ends_at, department:departments(code)").eq("college_id", ctx.college.id).order("starts_at", { ascending: false }).limit(5);
  if (ctx.departmentId) {
    annQ = annQ.eq("department_id", ctx.departmentId);
    evQ = evQ.eq("department_id", ctx.departmentId);
  }
  const [{ data: analytics }, { data: anns }, { data: evs }] = await Promise.all([
    supabase.rpc("college_analytics", { p_college: ctx.college.id }),
    annQ,
    evQ,
  ]);
  const a = (analytics ?? {}) as Record<string, number>;
  const now = requestTime();

  return (
    <div className="space-y-8">
      <Flash error={error} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="hd-1">Welcome to {ctx.college.short_name || ctx.college.name}</h1>
          <p className="mt-1 text-ink-2">
            {ctx.isCollegeAdmin ? "Everything published on your portal, in one place." : `You are publishing for ${ctx.member.department?.name ?? "your department"}.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={p("/admin/announcements/new")} className="btn-primary">New announcement</Link>
          <Link href={p("/admin/events/new")} className="btn-secondary">New event</Link>
          {ctx.isCollegeAdmin ? <Link href={p("/admin/departments/new")} className="btn-secondary">Add department</Link> : null}
        </div>
      </div>

      {ctx.isCollegeAdmin && (!ctx.college.logo_url || !ctx.college.cover_image_url) ? (
        <section aria-labelledby="brand-heading" className="panel flex flex-wrap items-center gap-5 p-5">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-brand-tint text-brand" aria-hidden="true">
            <ImagePlus size={24} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="brand-heading" className="hd-3">Make the portal look like {ctx.college.short_name || ctx.college.name}</h2>
            <p className="mt-0.5 text-ink-2">
              Add the college logo and a campus photo. The logo shows in the top corner of every portal page, and the photo runs across the top of the home page.
            </p>
            <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[0.875rem] font-bold">
              {[
                ["Logo", ctx.college.logo_url],
                ["Campus photo", ctx.college.cover_image_url],
              ].map(([label, done]) => (
                <li key={label as string} className={`inline-flex items-center gap-1.5 ${done ? "text-ok" : "text-ink-2"}`}>
                  {done ? <Check size={15} aria-hidden="true" /> : <Circle size={13} aria-hidden="true" />}
                  {label as string}
                  <span className="sr-only">{done ? "added" : "not added yet"}</span>
                </li>
              ))}
            </ul>
          </div>
          <Link href={p("/admin/profile#images")} className="btn-primary">Add logo and photo</Link>
        </section>
      ) : null}

      <StatRow
        stats={[
          { label: "Total announcements", value: a.total_announcements ?? 0 },
          { label: "Active events", value: a.active_events ?? 0 },
          { label: "Departments", value: a.departments ?? 0 },
          { label: "Urgent notices live", value: a.urgent_live ?? 0, tone: "urgent" },
          { label: "Total views", value: a.total_views ?? 0 },
        ]}
      />

      <div className="grid gap-8 xl:grid-cols-[1.4fr_1fr]">
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="hd-2">Recent announcements</h2>
            <Link href={p("/admin/announcements")} className="text-[0.9375rem] font-bold text-brand hover:underline">Manage</Link>
          </div>
          {anns?.length ? (
            <ul className="panel divide-y divide-line">
              {anns.map((n) => {
                const dept = n.department as unknown as { code: string } | null;
                return (
                  <li key={n.id} className="flex items-start justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <Link href={p(`/admin/announcements/${n.id}/edit`)} className="font-bold hover:underline">{n.title}</Link>
                      <p className="meta mt-0.5">{dept ? `${dept.code}, ` : "College-wide, "}{formatDateTime(n.published_at, ctx.college.timezone)}</p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">{n.is_urgent ? <UrgentBadge /> : null}<StatusPill status={noticeState(n, now)} /></div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState title="No announcements yet" body="Publish your first notice. Students see it within seconds." action={{ href: p("/admin/announcements/new"), label: "New announcement" }} />
          )}
        </section>
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="hd-2">Recent events</h2>
            <Link href={p("/admin/events")} className="text-[0.9375rem] font-bold text-brand hover:underline">Manage</Link>
          </div>
          {evs?.length ? (
            <ul className="panel divide-y divide-line">
              {evs.map((e) => (
                <li key={e.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <Link href={p(`/admin/events/${e.id}/edit`)} className="font-bold hover:underline">{e.title}</Link>
                    <p className="meta mt-0.5">{formatDate(e.starts_at, ctx.college.timezone)}</p>
                  </div>
                  <StatusPill status={eventState(e, now)} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No events yet" action={{ href: p("/admin/events/new"), label: "New event" }} />
          )}
        </section>
      </div>
    </div>
  );
}
