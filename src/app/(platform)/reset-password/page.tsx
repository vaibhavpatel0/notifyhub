"use client";

import Link from "next/link";
import { useActionState } from "react";
import { updatePassword } from "@/lib/actions/auth";
import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";

export default function ResetPasswordPage() {
  const [state, action] = useActionState(updatePassword, null);
  return (
    <div className="page-width max-w-md py-12 sm:py-16">
      <h1 className="hd-1">Choose a new password</h1>
      <form action={action} className="panel mt-6 space-y-4 p-6">
        <FormMessage state={state} />
        {state?.ok ? (
          <Link href="/login" className="btn-primary">Go to sign in</Link>
        ) : (
          <>
            <label className="block">
              <span className="field-label">New password</span>
              <input name="password" type="password" autoComplete="new-password" minLength={10} required className="input" />
              <span className="field-hint">At least 10 characters, with a letter and a number.</span>
            </label>
            <SubmitButton pendingLabel="Saving">Save password</SubmitButton>
          </>
        )}
      </form>
    </div>
  );
}
