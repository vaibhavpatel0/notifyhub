"use client";

import { useActionState, useState } from "react";
import { saveEvent } from "@/lib/actions/admin";
import { FieldError, FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { CampusEvent, DepartmentRef } from "@/lib/types";
import { FileUpload } from "./FileUpload";

export function EventForm({
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
  initial?: CampusEvent;
  initialDates?: { date: string; start: string; endDate: string; end: string };
}) {
  const [state, action] = useActionState(saveEvent, null);
  const [scope, setScope] = useState<"college" | "department">(lockedDepartment ? "department" : initial?.scope ?? "college");
  const [multiDay, setMultiDay] = useState(Boolean(initialDates && initialDates.endDate && initialDates.endDate !== initialDates.date));

  return (
    <form action={action} className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]" noValidate>
      <input type="hidden" name="college" value={slug} />
      {initial ? <input type="hidden" name="id" value={initial.id} /> : null}
      <div className="panel space-y-5 p-5 sm:p-6">
        <FormMessage state={state} />
        <label className="block">
          <span className="field-label">Event title</span>
          <input name="title" className="input text-[1.0625rem] font-bold" defaultValue={initial?.title} maxLength={200} required placeholder="CSE Hackathon 2026" />
          <FieldError state={state} name="title" />
        </label>
        <label className="block">
          <span className="field-label">Description</span>
          <textarea name="description" className="input min-h-44" defaultValue={initial?.description} maxLength={20000} />
        </label>
        <div className="grid gap-5 sm:grid-cols-3">
          <label className="block">
            <span className="field-label">Date</span>
            <input type="date" name="event_date" className="input" defaultValue={initialDates?.date} required />
            <FieldError state={state} name="event_date" />
          </label>
          <label className="block">
            <span className="field-label">Start time</span>
            <input type="time" name="start_time" className="input" defaultValue={initialDates?.start ?? "10:00"} required />
            <FieldError state={state} name="start_time" />
          </label>
          <label className="block">
            <span className="field-label">End time</span>
            <input type="time" name="end_time" className="input" defaultValue={initialDates?.end} />
            <FieldError state={state} name="end_time" />
          </label>
        </div>
        <label className="flex items-center gap-2 text-[0.9375rem]">
          <input type="checkbox" checked={multiDay} onChange={(e) => setMultiDay(e.target.checked)} className="accent-brand" />
          Ends on a different day
        </label>
        {multiDay ? (
          <label className="block max-w-xs">
            <span className="field-label">End date</span>
            <input type="date" name="end_date" className="input" defaultValue={initialDates?.endDate} />
          </label>
        ) : null}
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="field-label">Venue</span>
            <input name="venue" className="input" defaultValue={initial?.venue ?? ""} maxLength={200} placeholder="Seminar Hall, CSE Block" />
          </label>
          <label className="block">
            <span className="field-label">Organiser</span>
            <input name="organizer" className="input" defaultValue={initial?.organizer ?? ""} maxLength={200} placeholder="Department of CSE" />
          </label>
        </div>
        <label className="block">
          <span className="field-label">Registration link <span className="font-normal text-ink-3">(optional)</span></span>
          <input name="registration_url" type="url" className="input" defaultValue={initial?.registration_url ?? ""} placeholder="https://" />
          <FieldError state={state} name="registration_url" />
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <FileUpload collegeId={collegeId} kind="event-image" name="image_url" label="Image (optional)" defaultUrl={initial?.image_url} />
          <FileUpload collegeId={collegeId} kind="event-attachment" name="attachment_url" label="Attachment (optional)" variant="file" defaultUrl={initial?.attachment_url} defaultFileName={initial?.attachment_name} />
        </div>
      </div>
      <div className="space-y-5">
        <fieldset className="panel space-y-4 p-5">
          <legend className="sr-only">Audience and options</legend>
          {lockedDepartment ? (
            <div>
              <span className="field-label">Audience</span>
              <p className="rounded-md bg-sunken px-3 py-2 font-bold">{lockedDepartment.name}</p>
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
                  <select name="department_id" className="input" defaultValue={initial?.department_id ?? ""}>
                    <option value="">Choose a department</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.code}: {d.name}</option>)}
                  </select>
                  <FieldError state={state} name="department_id" />
                </label>
              ) : null}
            </div>
          )}
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" name="countdown_enabled" defaultChecked={initial?.countdown_enabled ?? true} className="mt-1 accent-brand" />
            <span>
              <span className="block font-bold">Show countdown</span>
              <span className="block text-[0.8125rem] text-ink-2">A live timer to the start time on the event page.</span>
            </span>
          </label>
          <div>
            <span className="field-label">Visibility</span>
            <select name="status" className="input" defaultValue={initial?.status === "draft" ? "draft" : "published"}>
              <option value="published">Published</option>
              <option value="draft">Draft (admins only)</option>
            </select>
          </div>
          <SubmitButton pendingLabel="Saving" className="btn-primary w-full">{initial ? "Save changes" : "Create event"}</SubmitButton>
        </fieldset>
      </div>
    </form>
  );
}
