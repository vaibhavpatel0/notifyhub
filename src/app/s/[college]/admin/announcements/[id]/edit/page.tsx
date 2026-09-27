import { notFound } from "next/navigation";
import { AnnouncementForm } from "@/components/admin/AnnouncementForm";
import { PageHeader } from "@/components/admin/PageHeader";
import { requireCollegeMember } from "@/lib/auth";
import { isoToZoned, refLabel, requestTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Announcement, DepartmentRef } from "@/lib/types";

export const metadata = { title: "Edit announcement" };

export default async function EditAnnouncement({ params }: { params: Promise<{ college: string; id: string }> }) {
  const { college: slug, id } = await params;
  const ctx = await requireCollegeMember(slug);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: n }, { data: depts }] = await Promise.all([
    supabase.from("announcements").select("*").eq("id", id).eq("college_id", ctx.college.id).maybeSingle(),
    supabase.from("departments").select("id, name, code, slug").eq("college_id", ctx.college.id).order("sort_order"),
  ]);
  if (!n) notFound();
  const a = n as Announcement;
  // Department admins may read other departments' notices but not edit them.
  if (ctx.departmentId && a.department_id !== ctx.departmentId) notFound();
  const tz = ctx.college.timezone;
  const pub = isoToZoned(a.published_at, tz);
  const exp = a.expires_at ? isoToZoned(a.expires_at, tz) : { date: "", time: "" };

  return (
    <div>
      <PageHeader title="Edit announcement" description={refLabel(a.ref_no, a.ref_year) ?? undefined} />
      <AnnouncementForm
        slug={slug}
        collegeId={ctx.college.id}
        departments={(depts ?? []) as DepartmentRef[]}
        lockedDepartment={ctx.departmentId ? ctx.member.department ?? null : null}
        initial={a}
        initialDates={{ publishDate: pub.date, publishTime: pub.time, expiresDate: exp.date, expiresTime: exp.time, isFuture: new Date(a.published_at).getTime() > requestTime() }}
      />
    </div>
  );
}
