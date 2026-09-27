"use client";

import { useEffect, useRef } from "react";
import { changePassword } from "@/lib/actions/admin";
import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { useFormAction } from "@/lib/use-form-action";

export function PasswordForm({ slug }: { slug: string }) {
  const [state, formProps, pending] = useFormAction(changePassword);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);
  return (
    <form ref={form} {...formProps} className="panel max-w-lg space-y-4 p-5">
      <input type="hidden" name="college" value={slug} />
      <h2 className="hd-3">Change password</h2>
      <FormMessage state={state} />
      <label className="block">
        <span className="field-label">New password</span>
        <input name="password" type="password" autoComplete="new-password" minLength={10} className="input" required />
        <span className="field-hint">At least 10 characters, with a letter and a number.</span>
      </label>
      <SubmitButton pending={pending} pendingLabel="Saving">Change password</SubmitButton>
    </form>
  );
}
