"use client";

import { startTransition, useActionState, type FormEvent } from "react";

/**
 * Like useActionState, but keeps what the person typed. React resets a form after
 * every `action` submit, even when the server returns a validation error. Here the
 * hydrated form submits through onSubmit (cancelling the native submit, which also
 * stops React's reset), while `action` stays on the form so it still posts to the
 * server action if someone submits before the page has finished loading.
 * Spread the returned props onto the <form>.
 */
export function useFormAction<R>(fn: (prev: R | null, formData: FormData) => Promise<R>) {
  const [state, dispatch, pending] = useActionState(fn, null);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(e.currentTarget, submitter instanceof HTMLElement ? submitter : undefined);
    startTransition(() => dispatch(formData));
  };
  return [state, { action: dispatch, onSubmit }, pending] as const;
}
