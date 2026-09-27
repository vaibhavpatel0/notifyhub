import type { ActionResult } from "@/lib/types";

/** Inline result banner for forms driven by useActionState. */
export function FormMessage({ state }: { state: ActionResult<unknown> | null | undefined }) {
  if (!state) return null;
  if (state.ok) {
    return state.message ? (
      <p role="status" className="rounded-md border border-ok/30 bg-ok-tint px-3 py-2 text-[0.9375rem] font-bold text-ok">
        {state.message}
      </p>
    ) : null;
  }
  return (
    <p role="alert" className="rounded-md border border-urgent/30 bg-urgent-tint px-3 py-2 text-[0.9375rem] font-bold text-urgent-strong">
      {state.error}
    </p>
  );
}

export function FieldError({ state, name }: { state: ActionResult<unknown> | null | undefined; name: string }) {
  if (!state || state.ok || !state.fieldErrors?.[name]) return null;
  return <span className="field-error">{state.fieldErrors[name]}</span>;
}
