import { EventForm } from "@/components/admin/EventForm";
import { PageHeader } from "@/components/admin/PageHeader";
import { requireCollegeMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { DepartmentRef } from "@/lib/types";

export const metadata = { title: "New event" };

export default async function NewEvent({ params }: { params: Promise<{ college: string }> }) {
  const { college: slug } = await params;
  const ctx = await requireCollegeMember(slug);
  const supabase = await createClient();
  const { data } = await supabase.from("departments").select("id, name, code, slug").eq("college_id", ctx.college.id).order("sort_order");
  return (
    <div>
      <PageHeader title="New event" />
      <EventForm slug={slug} collegeId={ctx.college.id} departments={(data ?? []) as DepartmentRef[]} lockedDepartment={ctx.departmentId ? ctx.member.department ?? null : null} />
    </div>
  );
}
