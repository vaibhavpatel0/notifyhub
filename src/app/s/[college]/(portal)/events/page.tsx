import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoSubmitSelect } from "@/components/portal/FilterControls";
import { EventRow } from "@/components/portal/EventRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { getPublicCollege, getPublicDepartments, getPublicEvents, yearParam } from "@/lib/data";
import { ordinal } from "@/lib/format";
import { portalPath } from "@/lib/tenant";

export const metadata: Metadata = { title: "Events" };

export default async function EventsPage({ params, searchParams }: { params: Promise<{ college: string }>; searchParams: Promise<{ when?: string; dept?: string; year?: string }> }) {
  const [{ college: slug }, sp] = await Promise.all([params, searchParams]);
  const college = await getPublicCollege(slug);
  if (!college) notFound();
  const p = (path: string) => portalPath(slug, path);
  const when = sp.when === "past" ? "past" : "upcoming";
  const departments = await getPublicDepartments(college.id);
  const dept = departments.find((d) => d.slug === sp.dept) ?? null;
  const maxYears = dept?.years_count ?? Math.max(4, ...departments.map((d) => d.years_count ?? 4));
  const year = yearParam(sp.year, maxYears);
  const events = await getPublicEvents(college.id, { when, departmentId: dept?.id, year, limit: 50 });

  const tab = (w: "upcoming" | "past") => p(`/events?when=${w}${dept ? `&dept=${dept.slug}` : ""}${year ? `&year=${year}` : ""}`);

  return (
    <div className="page-width py-8 sm:py-10">
      <h1 className="hd-1">Events</h1>
      <p className="mt-1 text-ink-2">College-wide and department events at {college.short_name || college.name}.</p>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <nav aria-label="Event time" className="inline-flex rounded-md border border-line bg-surface p-1">
          {(["upcoming", "past"] as const).map((w) => (
            <Link
              key={w}
              href={tab(w)}
              aria-current={when === w ? "page" : undefined}
              className={`rounded-sm px-4 py-1.5 text-[0.9375rem] font-bold ${when === w ? "text-white" : "text-ink-2 hover:text-ink"}`}
              style={when === w ? { background: "var(--tenant)" } : undefined}
            >
              {w === "upcoming" ? "Upcoming" : "Past"}
            </Link>
          ))}
        </nav>
        <form method="get" action={p("/events")} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="when" value={when} />
          <label className="min-w-48 flex-1 sm:flex-none">
            <span className="field-label">Department</span>
            <AutoSubmitSelect name="dept" defaultValue={dept?.slug ?? ""} className="input min-w-56">
              <option value="">All departments</option>
              {departments.map((d) => <option key={d.id} value={d.slug}>{d.code}: {d.name}</option>)}
            </AutoSubmitSelect>
          </label>
          <label className="min-w-36 flex-1 sm:flex-none">
            <span className="field-label">Year</span>
            <AutoSubmitSelect name="year" defaultValue={year ? String(year) : ""} className="input">
              <option value="">All years</option>
              {Array.from({ length: maxYears }, (_, i) => i + 1).map((y) => (
                <option key={y} value={y}>{ordinal(y)} year</option>
              ))}
            </AutoSubmitSelect>
          </label>
          <noscript><button type="submit" className="btn-secondary">Apply</button></noscript>
        </form>
      </div>

      <div className="mt-6">
        {events.length ? (
          <>
            <h2 className="sr-only">{when === "upcoming" ? "Upcoming events" : "Past events"}</h2>
            <div className="panel divide-y divide-line">
              {events.map((e) => <EventRow key={e.id} e={e} href={p(`/events/${e.id}`)} tz={college.timezone} />)}
            </div>
          </>
        ) : (
          <EmptyState
            title={when === "upcoming" ? "No upcoming events" : "No past events"}
            body={when === "upcoming" ? "New events will appear here as soon as they are announced." : undefined}
          />
        )}
      </div>
    </div>
  );
}
