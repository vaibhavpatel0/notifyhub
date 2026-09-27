"use client";

import { useState } from "react";
import { saveAnnouncement } from "@/lib/actions/admin";
import { CATEGORIES } from "@/lib/constants";
import { FieldError, FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { Announcement, DepartmentRef } from "@/lib/types";
import { FileUpload } from "./FileUpload";
import { YearPicker } from "./YearPicker";
import { useFormAction } from "@/lib/use-form-action";

export function AnnouncementForm({
  slug,
  collegeId,
  departments,
  lockedDepartment,
  initial,
  initialDates,
}: {
  slug: string;
  collegeId: string;
  departments: DepartmentRef[];
  lockedDepartment: DepartmentRef | null;
  initial?: Announcement;
  initialDates?: { publishDate: string; publishTime: string; expiresDate: string; expiresTime: string; isFuture: boolean };
}) {
  const [state, formProps, pending] = useFormAction(saveAnnouncement);
  const [scope, setScope] = useState<"college" | "department">(lockedDepartment ? "department" : initial?.scope ?? "college");
  const [departmentId, setDepartmentId] = useState(initial?.department_id ?? "");
  const [publish, setPublish] = useState<"now" | "schedule" | "draft">(
    initial?.status === "draft" ? "draft" : initialDates?.isFuture ? "schedule" : "now",
  );
  const [urgent, setUrgent] = useState(initial?.is_urgent ?? false);

  return (
    <form {...formProps} className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]" noValidate>
      <input type="hidden" name="college" value={slug} />
      {initial ? <input type="hidden" name="id" value={initial.id} /> : null}
      {initial && initial.status === "published" && !initialDates?.isFuture ? <input type="hidden" name="keep_published_at" value="1" /> : null}

      <div className="panel space-y-5 p-5 sm:p-6">
        <FormMessage state={state} />
        <label className="block">
          <span className="field-label">Title</span>
          <input name="title" className="input text-[1.0625rem] font-bold" defaultValue={initial?.title} maxLength={200} required placeholder="Internal examination schedule" />
          <FieldError state={state} name="title" />
        </label>
        <label className="block">
          <span className="field-label">Details</span>
          <textarea name="description" className="input min-h-56" defaultValue={initial?.description} maxLength={20000} placeholder="Dates, times, who it applies to and what students need to do." />
          <span className="field-hint">Plain text. Line breaks are kept.</span>
          <FieldError state={state} name="description" />
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <FileUpload collegeId={collegeId} kind="announcement-image" name="image_url" label="Image (optional)" defaultUrl={initial?.image_url} />
          <FileUpload collegeId={collegeId} kind="announcement-attachment" name="attachment_url" label="Attachment (optional)" variant="file" defaultUrl={initial?.attachment_url} defaultFileName={initial?.attachment_name} hint="PDF, Word, Excel, PowerPoint or image, up to 10 MB." />
        </div>
      </div>

      <div className="space-y-5">
        <fieldset className="panel space-y-4 p-5">
          <legend className="sr-only">Audience</legend>
          <label className="block">
            <span className="field-label">Category</span>
            <select name="category" className="input" defaultValue={initial?.category ?? "general"}>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>
          {lockedDepartment ? (
            <div>
              <span className="field-label">Audience</span>
              <p className="rounded-md bg-sunken px-3 py-2 font-bold">{lockedDepartment.name}</p>
              <span className="field-hint">Department admins publish for their own department.</span>
            </div>
          ) : (
            <div>
              <span className="field-label">Audience</span>
              <div className="grid grid-cols-2 gap-2">
                {(["college", "department"] as const).map((s) => (
                  <label key={s} className="flex cursor-pointer items-center gap-2 rounded-md border border-line px-3 py-2 has-[:checked]:border-brand has-[:checked]:bg-brand-tint">
                    <input type="radio" name="scope" value={s} checked={scope === s} onChange={() => setScope(s)} className="accent-brand" />
                    <span className="text-[0.9375rem] font-bold">{s === "college" ? "Whole college" : "Department"}</span>
                  </label>
                ))}
              </div>
              {scope === "department" ? (
                <label className="mt-3 block">
                  <span className="sr-only">Department</span>
                  <select name="department_id" className="input" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                    <option value="">Choose a department</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.code}: {d.name}</option>)}
                  </select>
                  <FieldError state={state} name="department_id" />
                </label>
              ) : null}
            </div>
          )}
          <YearPicker departments={departments} scope={scope} departmentId={departmentId} lockedDepartment={lockedDepartment} initial={initial?.years} />
          <label className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 ${urgent ? "border-urgent/50 bg-urgent-tint" : "border-line"}`}>
            <input type="checkbox" name="is_urgent" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} className="mt-1 accent-[#b3261e]" />
            <span>
              <span className="block font-bold">Mark as urgent</span>
              <span className="block text-[0.8125rem] text-ink-2">Shown in red at the top of the portal until it expires.</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-line px-3 py-2.5">
            <input type="checkbox" name="is_pinned" defaultChecked={initial?.is_pinned} className="mt-1 accent-brand" />
            <span>
              <span className="block font-bold">Important notice</span>
              <span className="block text-[0.8125rem] text-ink-2">Listed under Important notices on the home page.</span>
            </span>
          </label>
        </fieldset>

        <fieldset className="panel space-y-4 p-5">
          <legend className="sr-only">Publishing</legend>
          <div>
            <span className="field-label">Publish</span>
            <div className="space-y-1.5">
              {([["now", initial?.status === "published" ? "Published" : "Now"], ["schedule", "At a set time"], ["draft", "Save as draft"]] as const).map(([v, l]) => (
                <label key={v} className="flex cursor-pointer items-center gap-2">
                  <input type="radio" name="publish" value={v} checked={publish === v} onChange={() => setPublish(v)} className="accent-brand" />
                  <span className="text-[0.9375rem]">{l}</span>
                </label>
              ))}
            </div>
          </div>
          {publish === "schedule" ? (
            <div className="grid grid-cols-[minmax(0,1fr)_104px] gap-2">
              <label><span className="sr-only">Publish date</span><input type="date" name="publish_date" className="input" defaultValue={initialDates?.publishDate} /></label>
              <label><span className="sr-only">Publish time</span><input type="time" name="publish_time" className="input" defaultValue={initialDates?.publishTime || "09:00"} /></label>
              <FieldError state={state} name="publish_date" />
            </div>
          ) : null}
          <div>
            <span className="field-label">Expires <span className="font-normal text-ink-3">(optional)</span></span>
            <div className="grid grid-cols-[minmax(0,1fr)_104px] gap-2">
              <label><span className="sr-only">Expiry date</span><input type="date" name="expires_date" className="input" defaultValue={initialDates?.expiresDate} /></label>
              <label><span className="sr-only">Expiry time</span><input type="time" name="expires_time" className="input" defaultValue={initialDates?.expiresTime} /></label>
            </div>
            <span className="field-hint">Expired notices disappear from the portal automatically.</span>
            <FieldError state={state} name="expires_date" />
          </div>
          <SubmitButton pending={pending} pendingLabel="Saving" className="btn-primary w-full">
            {publish === "draft" ? "Save draft" : publish === "schedule" ? "Schedule" : initial ? "Save changes" : "Publish"}
          </SubmitButton>
        </fieldset>
      </div>
    </form>
  );
}
