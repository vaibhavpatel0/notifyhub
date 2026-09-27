"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { inviteAdmin } from "@/lib/actions/admin";
import { FieldError, FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { DepartmentRef } from "@/lib/types";

export function InviteForm({ slug, departments }: { slug: string; departments: DepartmentRef[] }) {
  const [state, action] = useActionState(inviteAdmin, null);
  const [role, setRole] = useState<"department_admin" | "college_admin">("department_admin");
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);

  return (
    <form ref={form} action={action} className="panel space-y-4 p-5" noValidate>
      <input type="hidden" name="college" value={slug} />
      <h2 className="hd-3">Add a team member</h2>
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="field-label">Name</span>
          <input name="name" className="input" required maxLength={120} />
          <FieldError state={state} name="name" />
        </label>
        <label className="block">
          <span className="field-label">Email</span>
          <input name="email" type="email" className="input" required />
          <FieldError state={state} name="email" />
        </label>
        <label className="block">
          <span className="field-label">Role</span>
          <select name="role" className="input" value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
            <option value="department_admin">Department admin</option>
            <option value="college_admin">College admin</option>
          </select>
        </label>
        {role === "department_admin" ? (
          <label className="block">
            <span className="field-label">Department</span>
            <select name="department_id" className="input" defaultValue="">
              <option value="" disabled>Choose a department</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.code}: {d.name}</option>)}
            </select>
            <FieldError state={state} name="department_id" />
          </label>
        ) : null}
      </div>
      <p className="text-[0.875rem] text-ink-2">
        {role === "department_admin"
          ? "Department admins can publish and edit notices and events for their department only."
          : "College admins can change everything, including the profile, departments and the team."}
      </p>
      <SubmitButton pendingLabel="Sending invitation">Send invitation</SubmitButton>
    </form>
  );
}
