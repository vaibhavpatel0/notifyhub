import { PageHeader } from "@/components/admin/PageHeader";
import { ProfileForm } from "@/components/admin/ProfileForm";
import { requireCollegeAdmin } from "@/lib/auth";
import { portalHost } from "@/lib/tenant";

export const metadata = { title: "College profile" };

export default async function ProfilePage({ params }: { params: Promise<{ college: string }> }) {
  const { college: slug } = await params;
  const ctx = await requireCollegeAdmin(slug);
  return (
    <div>
      <PageHeader title="College profile" description="How your portal looks to students and visitors." />
      <ProfileForm slug={slug} college={ctx.college} portalHost={portalHost(slug)} />
    </div>
  );
}
