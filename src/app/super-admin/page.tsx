import Link from "next/link";
import { CollegeTable, type CollegeListRow } from "@/components/admin/CollegeTable";
import { StatRow } from "@/components/admin/StatRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Overview" };

export default async function SuperAdminOverview() {
  const supabase = await createClient();
  const [{ data: stats }, { data: pending }] = await Promise.all([
    supabase.rpc("platform_stats"),
    supabase
      .from("colleges")
      .select("id, name, slug, official_website, status, verification_status, verification_method, is_demo, created_at")
      .or("status.eq.pending_review,verification_status.eq.manual_review")
      .order("created_at")
      .limit(10),
  ]);
  const s = (stats ?? {}) as Record<string, number>;
  return (
    <div className="space-y-8">
      <h1 className="hd-1">Overview</h1>
      <StatRow
        stats={[
          { label: "Total colleges", value: s.total ?? 0 },
          { label: "Verified colleges", value: s.verified ?? 0 },
          { label: "Pending colleges", value: s.pending ?? 0, tone: "urgent" },
          { label: "Active colleges", value: s.active ?? 0 },
          { label: "Suspended", value: s.suspended ?? 0 },
        ]}
      />
      <p className="text-[0.9375rem] text-ink-2">
        {s.onboarding ?? 0} registrations in progress, {(s.announcements ?? 0).toLocaleString("en-IN")} announcements and {(s.events ?? 0).toLocaleString("en-IN")} events across all portals.
      </p>
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="hd-2">Waiting for review</h2>
          <Link href="/super-admin/verifications" className="text-[0.9375rem] font-bold text-brand hover:underline">All pending</Link>
        </div>
        {pending?.length ? <CollegeTable rows={pending as CollegeListRow[]} back="/super-admin" /> : <EmptyState title="Nothing to review" body="New manual-review requests appear here." />}
      </section>
    </div>
  );
}
