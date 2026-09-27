import Link from "next/link";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatRow } from "@/components/admin/StatRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireCollegeMember } from "@/lib/auth";
import { formatDate, relativeTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { portalPath } from "@/lib/tenant";
import type { ActivityLog } from "@/lib/types";

export const metadata = { title: "Analytics" };

interface Analytics {
  total_announcements: number;
  announcements_this_month: number;
  active_events: number;
  urgent_live: number;
  total_views: number;
  departments: number;
  most_viewed: { id: string; title: string; view_count: number; published_at: string }[];
  department_activity: { id: string; name: string; code: string; posts: number; events: number }[];
}

const ACTIONS: Record<string, string> = { insert: "created", update: "edited", delete: "deleted", profile_update: "updated the profile" };
const ENTITY: Record<string, string> = { announcements: "announcement", events: "event", departments: "department", admins: "team member", colleges: "college" };

export default async function AnalyticsPage({ params }: { params: Promise<{ college: string }> }) {
  const { college: slug } = await params;
  const ctx = await requireCollegeMember(slug);
  const p = (path: string) => portalPath(slug, path);
  const supabase = await createClient();
  const [{ data }, { data: logs }, { data: team }] = await Promise.all([
    supabase.rpc("college_analytics", { p_college: ctx.college.id }),
    ctx.isCollegeAdmin
      ? supabase.from("activity_logs").select("*").eq("college_id", ctx.college.id).order("created_at", { ascending: false }).limit(25)
      : Promise.resolve({ data: [] as ActivityLog[] }),
    supabase.from("admins").select("user_id, name").eq("college_id", ctx.college.id),
  ]);
  const a = data as Analytics | null;
  if (!a) return <EmptyState title="Analytics are unavailable right now" />;
  const names = new Map((team ?? []).map((t) => [t.user_id as string, t.name as string]));
  const maxPosts = Math.max(1, ...a.department_activity.map((d) => d.posts));

  return (
    <div className="space-y-8">
      <PageHeader title="Analytics" description="A simple view of what is being published and read." />
      <StatRow
        stats={[
          { label: "Total announcements", value: a.total_announcements },
          { label: "This month", value: a.announcements_this_month },
          { label: "Active events", value: a.active_events },
          { label: "Urgent notices live", value: a.urgent_live, tone: "urgent" },
          { label: "Total views", value: a.total_views },
        ]}
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="hd-2 mb-3">Most viewed announcements</h2>
          {a.most_viewed.length ? (
            <ol className="panel divide-y divide-line">
              {a.most_viewed.map((n, i) => (
                <li key={n.id} className="flex items-baseline gap-3 px-4 py-3">
                  <span className="w-5 shrink-0 text-right font-extrabold text-ink-3 tabular-nums">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <Link href={p(`/admin/announcements/${n.id}/edit`)} className="font-bold hover:underline">{n.title}</Link>
                    <p className="meta">{formatDate(n.published_at, ctx.college.timezone)}</p>
                  </div>
                  <span className="shrink-0 font-bold tabular-nums">{n.view_count.toLocaleString("en-IN")} <span className="font-normal text-ink-3">views</span></span>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState title="No views yet" />
          )}
        </section>

        <section>
          <h2 className="hd-2">Department activity</h2>
          <p className="meta mb-3">Notices published in the last 30 days</p>
          {a.department_activity.length ? (
            <div className="panel p-4">
              <ul className="space-y-3">
                {a.department_activity.map((d) => (
                  <li key={d.id} className="grid grid-cols-[64px_1fr_40px] items-center gap-3" title={`${d.name}: ${d.posts} notices, ${d.events} events in 30 days`}>
                    <span className="font-extrabold">{d.code}</span>
                    <span className="hd-3 overflow-hidden rounded-r-sm bg-sunken" aria-hidden="true">
                      <span className="block h-full rounded-r-sm bg-brand" style={{ width: `${(d.posts / maxPosts) * 100}%`, minWidth: d.posts ? 4 : 0 }} />
                    </span>
                    <span className="text-right font-bold tabular-nums">{d.posts}</span>
                  </li>
                ))}
              </ul>
              <table className="sr-only">
                <caption>Department activity in the last 30 days</caption>
                <thead><tr><th>Department</th><th>Notices</th><th>Events</th></tr></thead>
                <tbody>{a.department_activity.map((d) => <tr key={d.id}><td>{d.name}</td><td>{d.posts}</td><td>{d.events}</td></tr>)}</tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No departments yet" />
          )}
        </section>
      </div>

      {ctx.isCollegeAdmin ? (
        <section>
          <h2 className="hd-2 mb-3">Recent activity</h2>
          {logs?.length ? (
            <ul className="panel divide-y divide-line">
              {(logs as ActivityLog[]).map((l) => (
                <li key={l.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-4 py-2.5 text-[0.9375rem]">
                  <span>
                    <strong>{l.admin_id ? names.get(l.admin_id) ?? "A former admin" : "NotifyHub"}</strong>{" "}
                    {l.action.startsWith("status:") ? `changed status to ${l.action.slice(7)} for` : ACTIONS[l.action] ?? l.action}{" "}
                    {l.action === "profile_update" ? null : <>the {ENTITY[l.entity_type] ?? l.entity_type} {l.summary ? <span className="text-ink-2">&ldquo;{l.summary}&rdquo;</span> : null}</>}
                  </span>
                  <span className="meta">{relativeTime(l.created_at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No activity yet" />
          )}
        </section>
      ) : null}
    </div>
  );
}
