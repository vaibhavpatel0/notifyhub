import { AnnouncementForm } from "@/components/admin/AnnouncementForm";
import { PageHeader } from "@/components/admin/PageHeader";
import { requireCollegeMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { DepartmentRef } from "@/lib/types";

export const metadata = { title: "New announcement" };

export default async function NewAnnouncement({ params }: { params: Promise<{ college: string }> }) {
  const { college: slug } = await params;
  const ctx = await requireCollegeMember(slug);
  const supabase = await createClient();
  const { data } = await supabase.from("departments").select("id, name, code, slug").eq("college_id", ctx.college.id).order("sort_order");
  return (
    <div>
      <PageHeader title="New announcement" />
      <AnnouncementForm slug={slug} collegeId={ctx.college.id} departments={(data ?? []) as DepartmentRef[]} lockedDepartment={ctx.departmentId ? ctx.member.department ?? null : null} />
    </div>
  );
}
