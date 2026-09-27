"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/lib/actions/auth";
import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";

export default function ForgotPasswordPage() {
  const [state, action] = useActionState(requestPasswordReset, null);
  return (
    <div className="page-width max-w-md py-12 sm:py-16">
      <h1 className="hd-1">Reset your password</h1>
      <p className="mt-2 text-ink-2">Enter the email you sign in with. We will send a link to choose a new password.</p>
      <form action={action} className="panel mt-6 space-y-4 p-6">
        <FormMessage state={state} />
        <label className="block">
          <span className="field-label">Email</span>
          <input name="email" type="email" autoComplete="email" required className="input" />
        </label>
        <SubmitButton pendingLabel="Sending">Send reset link</SubmitButton>
      </form>
    </div>
  );
}
