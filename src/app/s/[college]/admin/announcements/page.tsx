import Link from "next/link";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { Flash, PageHeader } from "@/components/admin/PageHeader";
import { StatusPill, UrgentBadge } from "@/components/ui/Badges";
import { EmptyState } from "@/components/ui/EmptyState";
import { deleteAnnouncement } from "@/lib/actions/admin";
import { requireCollegeMember } from "@/lib/auth";
import { categoryLabel } from "@/lib/constants";
import { noticeState } from "@/lib/content-status";
import { formatDateTime, refLabel, requestTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { portalPath } from "@/lib/tenant";

const TABS = [
  ["all", "All"],
  ["published", "Live"],
  ["scheduled", "Scheduled"],
  ["draft", "Drafts"],
  ["expired", "Expired"],
] as const;

export default async function AdminAnnouncements({ params, searchParams }: { params: Promise<{ college: string }>; searchParams: Promise<{ tab?: string; saved?: string; error?: string }> }) {
  const [{ college: slug }, sp] = await Promise.all([params, searchParams]);
  const ctx = await requireCollegeMember(slug);
  const p = (path: string) => portalPath(slug, path);
  const supabase = await createClient();
  let q = supabase
    .from("announcements")
    .select("id, title, category, status, scope, is_urgent, is_pinned, published_at, expires_at, view_count, ref_no, ref_year, department:departments(code)")
    .eq("college_id", ctx.college.id)
    .order("published_at", { ascending: false })
    .limit(200);
  if (ctx.departmentId) q = q.eq("department_id", ctx.departmentId);
  const { data } = await q;
  const now = requestTime();
  const tab = TABS.some(([k]) => k === sp.tab) ? sp.tab! : "all";
  const rows = (data ?? []).map((n) => ({ ...n, state: noticeState(n, now), dept: n.department as unknown as { code: string } | null }));
  const shown = tab === "all" ? rows : rows.filter((r) => r.state === tab);

  return (
    <div>
      <PageHeader
        title="Announcements"
        description={ctx.departmentId ? `Notices for ${ctx.member.department?.name}.` : "College-wide and department notices."}
        action={{ href: p("/admin/announcements/new"), label: "New announcement" }}
      />
      <Flash saved={sp.saved} error={sp.error} />
      <nav aria-label="Filter" className="mb-4 flex gap-1 overflow-x-auto">
        {TABS.map(([k, l]) => {
          const count = k === "all" ? rows.length : rows.filter((r) => r.state === k).length;
          return (
            <Link key={k} href={p(`/admin/announcements${k === "all" ? "" : `?tab=${k}`}`)} aria-current={tab === k ? "page" : undefined}
              className="rounded-md px-3 py-1.5 text-[0.9375rem] font-bold whitespace-nowrap text-ink-2 hover:bg-surface aria-[current=page]:bg-surface aria-[current=page]:text-ink aria-[current=page]:ring-1 aria-[current=page]:ring-line">
              {l} <span className="text-ink-3 tabular-nums">{count}</span>
            </Link>
          );
        })}
      </nav>
      {shown.length ? (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[0.9375rem]">
            <thead className="border-b border-line bg-sunken text-[0.8125rem] text-ink-3">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-bold">Notice</th>
                <th scope="col" className="px-4 py-2.5 font-bold">For</th>
                <th scope="col" className="px-4 py-2.5 font-bold">Status</th>
                <th scope="col" className="px-4 py-2.5 font-bold">Publish time</th>
                <th scope="col" className="px-4 py-2.5 text-right font-bold">Views</th>
                <th scope="col" className="px-4 py-2.5"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {shown.map((n) => (
                <tr key={n.id} className="align-top">
                  <td className="px-4 py-3">
                    <Link href={p(`/admin/announcements/${n.id}/edit`)} className="font-bold hover:underline">{n.title}</Link>
                    <div className="meta mt-1 flex flex-wrap items-center gap-2">
                      {n.is_urgent ? <UrgentBadge /> : null}
                      <span>{categoryLabel(n.category)}</span>
                      {refLabel(n.ref_no, n.ref_year) ? <span>{refLabel(n.ref_no, n.ref_year)}</span> : null}
                      {n.is_pinned ? <span className="font-bold text-ink-2">Important</span> : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{n.dept?.code ?? "College"}</td>
                  <td className="px-4 py-3"><StatusPill status={n.state} /></td>
                  <td className="px-4 py-3 whitespace-nowrap text-ink-2">{formatDateTime(n.published_at, ctx.college.timezone)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{n.view_count}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <Link href={p(`/admin/announcements/${n.id}/edit`)} className="btn-secondary btn-sm">Edit</Link>
                      <form action={deleteAnnouncement}>
                        <input type="hidden" name="college" value={slug} />
                        <input type="hidden" name="id" value={n.id} />
                        <ConfirmSubmit message={`Delete "${n.title}"? This cannot be undone.`}>Delete</ConfirmSubmit>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title={tab === "all" ? "No announcements yet" : "Nothing here"} action={{ href: p("/admin/announcements/new"), label: "New announcement" }} />
      )}
    </div>
  );
}
