"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { CollegeMark } from "@/components/portal/CollegeMark";
import { Spinner } from "@/components/ui/SubmitButton";
import type { CollegeSearchResult } from "@/app/api/colleges/search/route";

type State =
  | { kind: "idle" }
  | { kind: "loading"; previous: CollegeSearchResult[] }
  | { kind: "done"; query: string; results: CollegeSearchResult[] }
  | { kind: "error" };

/**
 * "Find your college" for students on the NotifyHub home page.
 * Results are ordinary links listed under the field; Enter opens the first one.
 */
export function CollegeSearch() {
  const id = useId();
  const [value, setValue] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef<AbortController | null>(null);

  function search(raw: string) {
    setValue(raw);
    if (timer.current) clearTimeout(timer.current);
    inflight.current?.abort();
    const q = raw.trim();
    if (q.length < 2) {
      setState({ kind: "idle" });
      return;
    }
    setState((s) => ({ kind: "loading", previous: s.kind === "done" ? s.results : s.kind === "loading" ? s.previous : [] }));
    timer.current = setTimeout(async () => {
      const ctrl = new AbortController();
      inflight.current = ctrl;
      try {
        const res = await fetch(`/api/colleges/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as { results: CollegeSearchResult[] };
        setState({ kind: "done", query: q, results: body.results });
      } catch (err) {
        if ((err as Error).name !== "AbortError") setState({ kind: "error" });
      }
    }, 250);
  }

  const results = state.kind === "done" ? state.results : state.kind === "loading" ? state.previous : [];
  const status =
    state.kind === "done"
      ? state.results.length
        ? `${state.results.length} ${state.results.length === 1 ? "college" : "colleges"} found`
        : ""
      : state.kind === "error"
        ? "Search is unavailable right now. Try again in a moment."
        : "";

  return (
    <div>
      <form
        role="search"
        aria-labelledby={`${id}-label`}
        onSubmit={(e) => {
          e.preventDefault();
          if (results[0]) window.location.assign(results[0].url);
        }}
      >
        <label id={`${id}-label`} htmlFor={`${id}-q`} className="text-[0.9375rem] font-extrabold">
          Students: find your college
        </label>
        <div className="relative mt-2">
          <Search size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-3" aria-hidden="true" />
          <input
            id={`${id}-q`}
            type="search"
            value={value}
            onChange={(e) => search(e.target.value)}
            placeholder="College name, short name or city"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="go"
            aria-describedby={`${id}-status`}
            className="input min-h-12 pr-10 pl-10 text-[1rem]"
          />
          {state.kind === "loading" ? (
            <span className="absolute top-1/2 right-3.5 -translate-y-1/2 text-ink-3">
              <Spinner />
              <span className="sr-only">Searching</span>
            </span>
          ) : null}
        </div>
      </form>

      <p id={`${id}-status`} aria-live="polite" className={status ? "meta mt-2" : "sr-only"}>
        {status}
      </p>

      {results.length ? (
        <ul className={`mt-2 divide-y divide-line rounded-lg border border-line bg-surface ${state.kind === "loading" ? "opacity-60" : ""}`}>
          {results.map((c) => (
            <li key={c.url}>
              <Link href={c.url} className="group flex items-center gap-3 px-3.5 py-3 hover:bg-sunken focus-visible:bg-sunken">
                <CollegeMark name={c.name} shortName={c.shortName} logoUrl={c.logoUrl} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block font-bold leading-snug">
                    {c.name}
                    {c.isDemo ? <span className="ml-2 rounded-xs bg-sunken px-1.5 py-0.5 align-middle text-[0.6875rem] font-bold text-ink-2">Demo</span> : null}
                  </span>
                  <span className="block truncate text-[0.8125rem] text-ink-3">{[c.place, c.host].filter(Boolean).join(" · ")}</span>
                </span>
                <ArrowRight size={18} className="shrink-0 text-ink-3 group-hover:text-ink" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      ) : state.kind === "done" ? (
        <div className="mt-2 rounded-lg border border-line bg-sunken px-4 py-3 text-[0.9375rem]">
          <p className="font-bold">No college matching “{state.query}” is on NotifyHub yet.</p>
          <p className="mt-1 text-ink-2">
            Check the spelling or try the short name. Colleges join by connecting their official website, so ask your college office to{" "}
            <Link href="/connect-college" className="link">connect the college</Link>.
          </p>
        </div>
      ) : (
        <p className="field-hint mt-2">Opens your college&apos;s notice board. No sign-in needed.</p>
      )}
    </div>
  );
}
