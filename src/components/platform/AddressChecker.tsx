"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { checkSlugAvailability } from "@/app/(platform)/connect-college/actions";
import { ROOT_DOMAIN, USE_SUBDOMAINS } from "@/lib/env";

/**
 * Lets a visitor type their college's short name and see the address
 * students would use, with a live availability check against the database.
 */
export function AddressChecker() {
  const id = useId();
  const [value, setValue] = useState("");
  const [result, setResult] = useState<{ slug: string; available: boolean; reason?: string } | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!value.trim()) return;
    const t = setTimeout(async () => {
      try {
        setResult(await checkSlugAvailability(value));
      } finally {
        setChecking(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div className="max-w-xl">
      <label htmlFor={id} className="field-label">
        Your college&apos;s address on NotifyHub
      </label>
      <div className="flex items-stretch overflow-hidden rounded-md border border-line-strong bg-surface focus-within:border-brand focus-within:outline-2 focus-within:outline-brand/25">
        {!USE_SUBDOMAINS ? <span className="flex items-center pl-3 text-[1.0625rem] text-ink-3">{ROOT_DOMAIN}/s/</span> : null}
        <input
          id={id}
          value={value}
          onChange={(e) => {
            const next = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40);
            setValue(next);
            setResult(null);
            setChecking(Boolean(next));
          }}
          placeholder="yourcollege"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent py-3 pl-3 text-[1.0625rem] font-bold outline-none placeholder:font-normal placeholder:text-ink-3"
          aria-describedby={`${id}-status`}
        />
        {USE_SUBDOMAINS ? <span className="flex items-center pr-3 text-[1.0625rem] text-ink-3">.{ROOT_DOMAIN}</span> : null}
      </div>
      <p id={`${id}-status`} className="mt-2 min-h-6 text-[0.9375rem]" aria-live="polite">
        {!value ? (
          <span className="text-ink-3">Type your college&apos;s short name, for example its initials.</span>
        ) : checking ? (
          <span className="text-ink-3">Checking…</span>
        ) : result?.available ? (
          <span className="font-bold text-ok">
            Available.{" "}
            <Link href={`/connect-college?slug=${result.slug}`} className="link">
              Start with this address
            </Link>
          </span>
        ) : result ? (
          <span className="font-bold text-urgent">{result.reason ?? "Not available."}</span>
        ) : null}
      </p>
    </div>
  );
}
