"use client";

import Link from "next/link";
import { signIn } from "@/lib/actions/auth";
import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { useFormAction } from "@/lib/use-form-action";

export function LoginForm({ next, college, notice, forgotHref }: { next?: string; college?: string; notice?: string | null; forgotHref: string }) {
  const [state, formProps, pending] = useFormAction(signIn);
  const choices = state?.ok ? state.data?.choices : undefined;

  if (choices?.length) {
    return (
      <div>
        <h2 className="hd-3">Choose a college</h2>
        <p className="mt-1 text-ink-2">Your account manages more than one portal.</p>
        <ul className="mt-4 divide-y divide-line rounded-md border border-line">
          {choices.map((c) => (
            <li key={c.url}>
              <a href={c.url} className="block px-4 py-3 font-bold hover:bg-sunken">{c.name}</a>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <form {...formProps} className="space-y-4">
      {notice ? <p className="rounded-md border border-new/30 bg-new-tint px-3 py-2 text-[0.9375rem] font-bold text-ink">{notice}</p> : null}
      <FormMessage state={state} />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {college ? <input type="hidden" name="college" value={college} /> : null}
      <label className="block">
        <span className="field-label">Email</span>
        <input name="email" type="email" autoComplete="email" required className="input" />
      </label>
      <label className="block">
        <span className="flex items-baseline justify-between">
          <span className="field-label">Password</span>
          <Link href={forgotHref} className="text-[0.875rem] font-bold text-brand hover:underline">Forgot password?</Link>
        </span>
        <input name="password" type="password" autoComplete="current-password" required className="input" />
      </label>
      <SubmitButton pending={pending} pendingLabel="Signing in" className="btn-primary w-full">Sign in</SubmitButton>
    </form>
  );
}
