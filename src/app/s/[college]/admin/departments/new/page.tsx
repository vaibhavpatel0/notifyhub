import { DepartmentForm } from "@/components/admin/DepartmentForm";
import { PageHeader } from "@/components/admin/PageHeader";
import { requireCollegeAdmin } from "@/lib/auth";
import { portalHost } from "@/lib/tenant";

export const metadata = { title: "Add department" };

export default async function NewDepartment({ params }: { params: Promise<{ college: string }> }) {
  const { college: slug } = await params;
  const ctx = await requireCollegeAdmin(slug);
  return (
    <div>
      <PageHeader title="Add department" />
      <DepartmentForm slug={slug} collegeId={ctx.college.id} portalBase={portalHost(slug)} />
    </div>
  );
}
