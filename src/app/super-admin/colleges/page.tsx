import Link from "next/link";
import { CollegeTable, StaffFlash, type CollegeListRow } from "@/components/admin/CollegeTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Colleges" };

const TABS = [["all", "All"], ["active", "Active"], ["pending_review", "Pending"], ["suspended", "Suspended"], ["rejected", "Rejected"], ["onboarding", "In progress"]] as const;

export default async function Colleges({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; saved?: string; error?: string }> }) {
  const sp = await searchParams;
  const status = TABS.some(([k]) => k === sp.status) ? sp.status! : "all";
  const q = (sp.q ?? "").trim().slice(0, 80);
  const supabase = await createClient();
  let query = supabase
    .from("colleges")
    .select("id, name, slug, official_website, status, verification_status, verification_method, is_demo, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (status !== "all") query = query.eq("status", status);
  if (q) query = query.or(`name.ilike.%${q.replace(/[%,()]/g, "")}%,slug.ilike.%${q.replace(/[%,()]/g, "")}%,website_domain.ilike.%${q.replace(/[%,()]/g, "")}%`);
  const { data } = await query;
  const back = `/super-admin/colleges${status !== "all" ? `?status=${status}` : ""}`;

  return (
    <div>
      <h1 className="hd-1 mb-5">Colleges</h1>
      <StaffFlash saved={sp.saved} error={sp.error} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Status" className="flex gap-1 overflow-x-auto">
          {TABS.map(([k, l]) => (
            <Link key={k} href={`/super-admin/colleges${k === "all" ? "" : `?status=${k}`}`} aria-current={status === k ? "page" : undefined}
              className="rounded-md px-3 py-1.5 text-[0.9375rem] font-bold whitespace-nowrap text-ink-2 hover:bg-surface aria-[current=page]:bg-surface aria-[current=page]:text-ink aria-[current=page]:ring-1 aria-[current=page]:ring-line">
              {l}
            </Link>
          ))}
        </nav>
        <form method="get" className="flex gap-2">
          {status !== "all" ? <input type="hidden" name="status" value={status} /> : null}
          <label className="sr-only" htmlFor="cq">Search colleges</label>
          <input id="cq" name="q" defaultValue={q} className="input min-h-9 w-56" placeholder="Name, address or domain" />
          <button className="btn-secondary btn-sm" type="submit">Search</button>
        </form>
      </div>
      {data?.length ? <CollegeTable rows={data as CollegeListRow[]} back={back} /> : <EmptyState title="No colleges in this view" />}
    </div>
  );
}
