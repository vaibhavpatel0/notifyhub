import { notFound } from "next/navigation";
import { DepartmentForm } from "@/components/admin/DepartmentForm";
import { PageHeader } from "@/components/admin/PageHeader";
import { requireCollegeAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { portalHost } from "@/lib/tenant";
import type { Department } from "@/lib/types";

export const metadata = { title: "Edit department" };

export default async function EditDepartment({ params }: { params: Promise<{ college: string; id: string }> }) {
  const { college: slug, id } = await params;
  const ctx = await requireCollegeAdmin(slug);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data } = await supabase.from("departments").select("*").eq("id", id).eq("college_id", ctx.college.id).maybeSingle();
  if (!data) notFound();
  return (
    <div>
      <PageHeader title={`Edit ${(data as Department).code}`} />
      <DepartmentForm slug={slug} collegeId={ctx.college.id} initial={data as Department} portalBase={portalHost(slug)} />
    </div>
  );
}
