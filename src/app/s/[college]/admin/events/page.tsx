import Link from "next/link";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { Flash, PageHeader } from "@/components/admin/PageHeader";
import { StatusPill } from "@/components/ui/Badges";
import { EmptyState } from "@/components/ui/EmptyState";
import { deleteEvent } from "@/lib/actions/admin";
import { requireCollegeMember } from "@/lib/auth";
import { eventState } from "@/lib/content-status";
import { formatDateTime, requestTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { portalPath } from "@/lib/tenant";

export default async function AdminEvents({ params, searchParams }: { params: Promise<{ college: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const [{ college: slug }, sp] = await Promise.all([params, searchParams]);
  const ctx = await requireCollegeMember(slug);
  const p = (path: string) => portalPath(slug, path);
  const supabase = await createClient();
  let q = supabase
    .from("events")
    .select("id, title, status, starts_at, ends_at, venue, department:departments(code)")
    .eq("college_id", ctx.college.id)
    .order("starts_at", { ascending: false })
    .limit(200);
  if (ctx.departmentId) q = q.eq("department_id", ctx.departmentId);
  const { data } = await q;
  const now = requestTime();

  return (
    <div>
      <PageHeader title="Events" action={{ href: p("/admin/events/new"), label: "New event" }} />
      <Flash saved={sp.saved === "published" ? "1" : sp.saved} error={sp.error} />
      {data?.length ? (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-[0.9375rem]">
            <thead className="border-b border-line bg-sunken text-[0.8125rem] text-ink-3">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-bold">Event</th>
                <th scope="col" className="px-4 py-2.5 font-bold">For</th>
                <th scope="col" className="px-4 py-2.5 font-bold">Starts</th>
                <th scope="col" className="px-4 py-2.5 font-bold">Status</th>
                <th scope="col" className="px-4 py-2.5"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.map((e) => {
                const dept = e.department as unknown as { code: string } | null;
                return (
                  <tr key={e.id} className="align-top">
                    <td className="px-4 py-3">
                      <Link href={p(`/admin/events/${e.id}/edit`)} className="font-bold hover:underline">{e.title}</Link>
                      {e.venue ? <p className="meta mt-0.5">{e.venue}</p> : null}
                    </td>
                    <td className="px-4 py-3">{dept?.code ?? "College"}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-ink-2">{formatDateTime(e.starts_at, ctx.college.timezone)}</td>
                    <td className="px-4 py-3"><StatusPill status={eventState(e, now)} /></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Link href={p(`/admin/events/${e.id}/edit`)} className="btn-secondary btn-sm">Edit</Link>
                        <form action={deleteEvent}>
                          <input type="hidden" name="college" value={slug} />
                          <input type="hidden" name="id" value={e.id} />
                          <ConfirmSubmit message={`Delete "${e.title}"?`}>Delete</ConfirmSubmit>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No events yet" body="Add hackathons, workshops, fests and meetings with a live countdown." action={{ href: p("/admin/events/new"), label: "New event" }} />
      )}
    </div>
  );
}
