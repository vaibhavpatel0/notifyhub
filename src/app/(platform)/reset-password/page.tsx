"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { updatePassword } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";

/**
 * Used for "forgot password" and for invited admins choosing their first password.
 * Invite links arrive with the session in the URL fragment (#access_token=...),
 * which only the browser can read, so it is turned into a session here.
 */
export default function ResetPasswordPage() {
  const [state, action] = useActionState(updatePassword, null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    const hashError = hash.get("error_description");
    const finish = (err: string | null) => {
      if (err) setLinkError(err);
      setReady(true);
    };
    if (hashError) {
      finish("This link has expired or was already used. Request a new one.");
    } else if (accessToken && refreshToken) {
      createClient()
        .auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }: { error: unknown }) => {
          window.history.replaceState(null, "", window.location.pathname);
          finish(error ? "This link has expired or was already used. Request a new one." : null);
        });
    } else {
      const t = setTimeout(() => finish(null), 0);
      return () => clearTimeout(t);
    }
  }, []);

  return (
    <div className="page-width max-w-md py-12 sm:py-16">
      <h1 className="hd-1">Choose a password</h1>
      <div className="panel mt-6 space-y-4 p-6">
        {linkError ? (
          <>
            <FormMessage state={{ ok: false, error: linkError }} />
            <Link href="/forgot-password" className="btn-secondary">Request a new link</Link>
          </>
        ) : state?.ok ? (
          <>
            <FormMessage state={state} />
            <Link href="/login" className="btn-primary">Go to sign in</Link>
          </>
        ) : (
          <form action={action} className="space-y-4">
            <FormMessage state={state} />
            <label className="block">
              <span className="field-label">New password</span>
              <input name="password" type="password" autoComplete="new-password" minLength={10} required className="input" />
              <span className="field-hint">At least 10 characters, with a letter and a number.</span>
            </label>
            <SubmitButton pendingLabel="Saving">Save password</SubmitButton>
            {!ready ? <span className="sr-only">Checking your link</span> : null}
          </form>
        )}
      </div>
    </div>
  );
}
