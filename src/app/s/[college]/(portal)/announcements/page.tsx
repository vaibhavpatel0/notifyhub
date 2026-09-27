import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requestTime } from "@/lib/format";
import { Search } from "lucide-react";
import { AutoSubmitSelect } from "@/components/portal/FilterControls";
import { NoticeRow } from "@/components/portal/NoticeRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { CATEGORIES, QUICK_FILTERS } from "@/lib/constants";
import { getPublicCollege, getPublicDepartments } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { portalPath } from "@/lib/tenant";
import type { AnnouncementSearchRow } from "@/lib/types";

export const metadata: Metadata = { title: "Announcements" };

const PAGE_SIZE = 15;
type Search = { q?: string; cat?: string; dept?: string; sort?: string; page?: string };

export default async function AnnouncementsPage({ params, searchParams }: { params: Promise<{ college: string }>; searchParams: Promise<Search> }) {
  const [{ college: slug }, sp] = await Promise.all([params, searchParams]);
  const college = await getPublicCollege(slug);
  if (!college) notFound();
  const p = (path: string) => portalPath(slug, path);

  const q = (sp.q ?? "").slice(0, 120);
  const cat = sp.cat && (sp.cat === "urgent" || CATEGORIES.some((c) => c.value === sp.cat)) ? sp.cat : "all";
  const sort = sp.sort === "oldest" || sp.sort === "upcoming" ? sp.sort : "latest";
  const page = Math.max(1, Math.min(200, Number(sp.page) || 1));

  const departments = await getPublicDepartments(college.id);
  const dept = departments.find((d) => d.slug === sp.dept) ?? null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_announcements", {
    p_college: college.id,
    p_query: q || null,
    p_category: cat !== "all" && cat !== "urgent" ? cat : null,
    p_department: dept?.id ?? null,
    p_urgent: cat === "urgent" ? true : null,
    p_scope: null,
    p_sort: sort,
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });
  const rows = (data ?? []) as AnnouncementSearchRow[];
  const total = rows[0]?.total_count ?? 0;
  const now = requestTime();

  const href = (over: Partial<Search>) => {
    const u = new URLSearchParams();
    const merged = { q: q || undefined, cat: cat !== "all" ? cat : undefined, dept: dept?.slug, sort: sort !== "latest" ? sort : undefined, ...over };
    for (const [k, v] of Object.entries(merged)) if (v) u.set(k, String(v));
    const s = u.toString();
    return p(`/announcements${s ? `?${s}` : ""}`);
  };

  return (
    <div className="page-width py-8 sm:py-10">
      <h1 className="hd-1">Announcements</h1>
      <p className="mt-1 text-ink-2">Every live notice from {college.short_name || college.name}, including department notices.</p>

      <form method="get" action={p("/announcements")} role="search" className="mt-6 space-y-4">
        {cat !== "all" ? <input type="hidden" name="cat" value={cat} /> : null}
        <div className="flex gap-2">
          <label className="sr-only" htmlFor="q">Search announcements</label>
          <div className="relative flex-1">
            <Search size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" aria-hidden="true" />
            <input id="q" name="q" type="search" defaultValue={q} placeholder="Search announcements..." className="input min-h-11 pl-10" />
          </div>
          <button type="submit" className="btn-tenant min-h-11">Search</button>
        </div>

        <nav aria-label="Filter by category" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <ul className="flex w-max gap-1.5 sm:w-auto sm:flex-wrap">
            {QUICK_FILTERS.map((f) => {
              const active = cat === f.key;
              return (
                <li key={f.key}>
                  <Link
                    href={href({ cat: f.key === "all" ? undefined : f.key, page: undefined })}
                    aria-current={active ? "true" : undefined}
                    className={`inline-flex min-h-9 items-center rounded-md border px-3 text-[0.875rem] font-bold whitespace-nowrap ${
                      active ? "border-transparent text-white" : f.key === "urgent" ? "border-urgent/40 bg-surface text-urgent hover:bg-urgent-tint" : "border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink"
                    }`}
                    style={active ? { background: f.key === "urgent" ? "var(--color-urgent)" : "var(--tenant)" } : undefined}
                  >
                    {f.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-48 flex-1 sm:flex-none">
            <span className="field-label">Department</span>
            <AutoSubmitSelect name="dept" defaultValue={dept?.slug ?? ""} className="input">
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.slug}>{d.code}: {d.name}</option>
              ))}
            </AutoSubmitSelect>
          </label>
          <label className="min-w-40 flex-1 sm:flex-none">
            <span className="field-label">Sort by</span>
            <AutoSubmitSelect name="sort" defaultValue={sort} className="input">
              <option value="latest">Latest</option>
              <option value="oldest">Oldest</option>
              <option value="upcoming">Upcoming deadlines</option>
            </AutoSubmitSelect>
          </label>
          <noscript><button type="submit" className="btn-secondary">Apply</button></noscript>
        </div>
      </form>

      <div className="mt-6" aria-live="polite">
        <p className="meta mb-2">
          {error ? "Search is unavailable right now. Please try again." : `${total} ${total === 1 ? "notice" : "notices"}${q ? ` matching “${q}”` : ""}`}
          {q || cat !== "all" || dept || sort !== "latest" ? (
            <>
              {" "}
              <Link href={p("/announcements")} className="font-bold underline underline-offset-2">Clear filters</Link>
            </>
          ) : null}
        </p>
        {rows.length ? (
          <div className="panel divide-y divide-line">
            {rows.map((r) => (
              <NoticeRow
                key={r.id}
                n={{ ...r, department: r.department_code ? { code: r.department_code, name: r.department_name ?? "" } : null }}
                href={p(`/announcements/${r.id}`)}
                tz={college.timezone}
                now={now}
              />
            ))}
          </div>
        ) : !error ? (
          <EmptyState
            title={q ? "No notices match your search" : "No notices in this view"}
            body={q ? "Try fewer words, check the spelling, or search across all categories." : "Try another category or department."}
            action={{ href: p("/announcements"), label: "Show all announcements" }}
          />
        ) : null}
      </div>

      {total > PAGE_SIZE ? (
        <nav aria-label="Pages" className="mt-6 flex items-center justify-between gap-3">
          {page > 1 ? <Link className="btn-secondary" href={href({ page: String(page - 1) })}>Newer</Link> : <span />}
          <span className="meta">Page {page} of {Math.ceil(total / PAGE_SIZE)}</span>
          {page * PAGE_SIZE < total ? <Link className="btn-secondary" href={href({ page: String(page + 1) })}>Older</Link> : <span />}
        </nav>
      ) : null}
    </div>
  );
}
