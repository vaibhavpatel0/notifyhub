import { notFound } from "next/navigation";
import { EventForm } from "@/components/admin/EventForm";
import { PageHeader } from "@/components/admin/PageHeader";
import { requireCollegeMember } from "@/lib/auth";
import { isoToZoned } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { CampusEvent, DepartmentRef } from "@/lib/types";

export const metadata = { title: "Edit event" };

export default async function EditEvent({ params }: { params: Promise<{ college: string; id: string }> }) {
  const { college: slug, id } = await params;
  const ctx = await requireCollegeMember(slug);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: ev }, { data: depts }] = await Promise.all([
    supabase.from("events").select("*").eq("id", id).eq("college_id", ctx.college.id).maybeSingle(),
    supabase.from("departments").select("id, name, code, slug, years_count").eq("college_id", ctx.college.id).order("sort_order"),
  ]);
  if (!ev) notFound();
  const e = ev as CampusEvent;
  if (ctx.departmentId && e.department_id !== ctx.departmentId) notFound();
  const tz = ctx.college.timezone;
  const s = isoToZoned(e.starts_at, tz);
  const en = e.ends_at ? isoToZoned(e.ends_at, tz) : { date: "", time: "" };
  return (
    <div>
      <PageHeader title="Edit event" />
      <EventForm
        slug={slug}
        collegeId={ctx.college.id}
        departments={(depts ?? []) as DepartmentRef[]}
        lockedDepartment={ctx.departmentId ? ctx.member.department ?? null : null}
        initial={e}
        initialDates={{ date: s.date, start: s.time, endDate: en.date, end: en.time }}
      />
    </div>
  );
}
