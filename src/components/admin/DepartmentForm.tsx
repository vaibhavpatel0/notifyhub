"use client";

import { useState } from "react";
import { saveDepartment } from "@/lib/actions/admin";
import { slugify } from "@/lib/onboarding/slug";
import { FieldError, FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { Department } from "@/lib/types";
import { FileUpload } from "./FileUpload";
import { useFormAction } from "@/lib/use-form-action";

export function DepartmentForm({ slug, collegeId, initial, portalBase }: { slug: string; collegeId: string; initial?: Department; portalBase: string }) {
  const [state, formProps, pending] = useFormAction(saveDepartment);
  const [code, setCode] = useState(initial?.code ?? "");
  const [path, setPath] = useState(initial?.slug ?? "");
  const [touched, setTouched] = useState(Boolean(initial));
  const effective = touched ? path : slugify(code);

  return (
    <form {...formProps} className="panel max-w-3xl space-y-5 p-5 sm:p-6" noValidate>
      <input type="hidden" name="college" value={slug} />
      {initial ? <input type="hidden" name="id" value={initial.id} /> : null}
      <FormMessage state={state} />
      <div className="grid gap-5 sm:grid-cols-[140px_1fr]">
        <label className="block">
          <span className="field-label">Short code</span>
          <input name="code" className="input font-extrabold uppercase" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={12} placeholder="CSE" required />
          <FieldError state={state} name="code" />
        </label>
        <label className="block">
          <span className="field-label">Department name</span>
          <input name="name" className="input" defaultValue={initial?.name} maxLength={120} placeholder="Computer Science and Engineering" required />
          <FieldError state={state} name="name" />
        </label>
      </div>
      <label className="block">
        <span className="field-label">Page address</span>
        <span className="flex items-center gap-1 text-ink-3">
          <span className="shrink-0 text-[0.9375rem]">{portalBase}/departments/</span>
          <input name="slug" className="input" value={effective} onChange={(e) => { setTouched(true); setPath(e.target.value.toLowerCase()); }} maxLength={40} />
        </span>
        <FieldError state={state} name="slug" />
      </label>
      <label className="block max-w-xs">
        <span className="field-label">Course length</span>
        <select name="years_count" className="input" defaultValue={String(initial?.years_count ?? 4)}>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>{n} {n === 1 ? "year" : "years"}</option>
          ))}
        </select>
        <span className="field-hint">Sets the years admins can pick on notices, for example 4 for B.Tech or 2 for MBA.</span>
        <FieldError state={state} name="years_count" />
      </label>
      <label className="block">
        <span className="field-label">Description</span>
        <textarea name="description" className="input min-h-28" defaultValue={initial?.description ?? ""} maxLength={2000} />
      </label>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="field-label">Head of department</span>
          <input name="head_name" className="input" defaultValue={initial?.head_name ?? ""} maxLength={120} />
        </label>
        <label className="flex items-center gap-2 self-end pb-2.5">
          <input type="checkbox" name="show_head" defaultChecked={initial?.show_head ?? true} className="accent-brand" />
          <span className="text-[0.9375rem]">Show on the public department page</span>
        </label>
      </div>
      <FileUpload collegeId={collegeId} kind="department-image" name="image_url" label="Department image (optional)" defaultUrl={initial?.image_url} />
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="field-label">Status</span>
          <select name="status" className="input" defaultValue={initial?.status ?? "active"}>
            <option value="active">Active (shown publicly)</option>
            <option value="hidden">Hidden</option>
          </select>
        </label>
        <label className="block">
          <span className="field-label">Order</span>
          <input name="sort_order" type="number" min={0} max={999} className="input" defaultValue={initial?.sort_order ?? 0} />
          <span className="field-hint">Lower numbers are listed first.</span>
        </label>
      </div>
      <div className="border-t border-line pt-5">
        <SubmitButton pending={pending} pendingLabel="Saving">{initial ? "Save department" : "Add department"}</SubmitButton>
      </div>
    </form>
  );
}
