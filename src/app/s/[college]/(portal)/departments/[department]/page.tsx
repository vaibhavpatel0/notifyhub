/* eslint-disable @next/next/no-img-element -- department images are user uploads served from storage */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requestTime } from "@/lib/format";
import { EventRow } from "@/components/portal/EventRow";
import { NoticeRow } from "@/components/portal/NoticeRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { getLiveAnnouncements, getPublicCollege, getPublicDepartments, getPublicEvents } from "@/lib/data";
import { portalPath } from "@/lib/tenant";

type Params = Promise<{ college: string; department: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { college: slug, department } = await params;
  const college = await getPublicCollege(slug);
  const d = college ? (await getPublicDepartments(college.id)).find((x) => x.slug === department) : null;
  return d ? { title: d.name, description: `Notices and events from the ${d.name} department.` } : {};
}

export default async function DepartmentPage({ params }: { params: Params }) {
  const { college: slug, department } = await params;
  const college = await getPublicCollege(slug);
  if (!college) notFound();
  const dept = (await getPublicDepartments(college.id)).find((d) => d.slug === department);
  if (!dept) notFound();
  const p = (path: string) => portalPath(slug, path);

  const [notices, events] = await Promise.all([
    getLiveAnnouncements(college.id, { departmentId: dept.id, limit: 30 }),
    getPublicEvents(college.id, { when: "upcoming", departmentId: dept.id, limit: 10 }),
  ]);
  const important = notices.filter((n) => n.is_urgent || n.is_pinned);
  const rest = notices.filter((n) => !n.is_urgent && !n.is_pinned);
  const now = requestTime();

  return (
    <div>
      <section className="border-b border-line bg-surface">
        <div className={`page-width grid gap-6 py-8 ${dept.image_url ? "md:grid-cols-[1fr_360px] md:items-center" : ""}`}>
          <div>
            <nav aria-label="Breadcrumb" className="meta">
              <Link href={p("/departments")} className="font-bold hover:underline">Departments</Link>
            </nav>
            <p className="mt-3 text-[1rem] font-extrabold" style={{ color: "var(--tenant)" }}>{dept.code}</p>
            <h1 className="hd-1">{dept.name}</h1>
            {dept.description ? <p className="lede mt-2 max-w-[62ch]">{dept.description}</p> : null}
            {dept.head_name && dept.show_head ? <p className="mt-3 text-ink-2">Head of department: <strong className="text-ink">{dept.head_name}</strong></p> : null}
          </div>
          {dept.image_url ? <img src={dept.image_url} alt="" className="aspect-[3/2] w-full rounded-lg border border-line object-cover" /> : null}
        </div>
      </section>

      <div className="page-width grid gap-10 py-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-8">
          {important.length ? (
            <section aria-labelledby="dept-important">
              <h2 id="dept-important" className="hd-2 mb-3">Important notices</h2>
              <div className="panel divide-y divide-line">
                {important.map((n) => <NoticeRow key={n.id} n={n} href={p(`/announcements/${n.id}`)} tz={college.timezone} showDept={false} now={now} />)}
              </div>
            </section>
          ) : null}
          <section aria-labelledby="dept-notices">
            <h2 id="dept-notices" className="hd-2 mb-3">Department announcements</h2>
            {rest.length ? (
              <div className="panel divide-y divide-line">
                {rest.map((n) => <NoticeRow key={n.id} n={n} href={p(`/announcements/${n.id}`)} tz={college.timezone} showDept={false} now={now} />)}
              </div>
            ) : (
              <EmptyState title={important.length ? "No other notices" : "No department notices right now"} />
            )}
          </section>
        </div>
        <section aria-labelledby="dept-events">
          <h2 id="dept-events" className="hd-2 mb-3">Upcoming events</h2>
          {events.length ? (
            <div className="panel divide-y divide-line">
              {events.map((e) => <EventRow key={e.id} e={{ ...e, department: null }} href={p(`/events/${e.id}`)} tz={college.timezone} compact />)}
            </div>
          ) : (
            <EmptyState title="No upcoming events" />
          )}
        </section>
      </div>
    </div>
  );
}
