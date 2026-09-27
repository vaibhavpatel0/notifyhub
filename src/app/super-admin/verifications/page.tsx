import { CollegeTable, StaffFlash, type CollegeListRow } from "@/components/admin/CollegeTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Pending verifications" };

export default async function Verifications({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("colleges")
    .select("id, name, slug, official_website, status, verification_status, verification_method, is_demo, created_at")
    .or("status.eq.pending_review,verification_status.eq.manual_review")
    .neq("status", "rejected")
    .order("created_at");
  return (
    <div>
      <h1 className="hd-1">Pending verifications</h1>
      <p className="mt-1 mb-5 text-ink-2">
        Colleges that asked for manual review, verified an email not published on their website, or registered while manual approval is required.
        Confirm each one using contact details from the official website, never those in the request.
      </p>
      <StaffFlash saved={sp.saved} error={sp.error} />
      {data?.length ? <CollegeTable rows={data as CollegeListRow[]} back="/super-admin/verifications" /> : <EmptyState title="Nothing waiting" />}
    </div>
  );
}
