"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { CollegeMark } from "@/components/portal/CollegeMark";
import { Spinner } from "@/components/ui/SubmitButton";
import type { CollegeSearchResult } from "@/app/api/colleges/search/route";

type Data = { query: string; results: CollegeSearchResult[]; total: number };

/**
 * "Find your college" on the NotifyHub home page.
 * Lists every connected college before anything is typed, then suggests matches
 * as the student types a name, short form ("vp", "vpcet", "vit") or city.
 * Up/Down move through the suggestions and Enter opens one.
 */
export function CollegeSearch() {
  const id = useId();
  const listId = `${id}-list`;
  const [value, setValue] = useState("");
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(-1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef<AbortController | null>(null);

  function load(q: string) {
    inflight.current?.abort();
    const ctrl = new AbortController();
    inflight.current = ctrl;
    fetchColleges(q, ctrl.signal).then(
      (body) => {
        setData({ query: q, ...body });
        setFailed(false);
        setActive(-1);
        setLoading(false);
      },
      (err: Error) => {
        if (err.name === "AbortError") return;
        setFailed(true);
        setLoading(false);
      },
    );
  }

  // Every connected college, shown before anything is typed.
  useEffect(() => {
    const ctrl = new AbortController();
    inflight.current = ctrl;
    fetchColleges("", ctrl.signal).then(
      (body) => {
        setData({ query: "", ...body });
        setLoading(false);
      },
      (err: Error) => {
        if (err.name === "AbortError") return;
        setFailed(true);
        setLoading(false);
      },
    );
    return () => ctrl.abort();
  }, []);

  function onType(raw: string) {
    setValue(raw);
    setLoading(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => load(raw.trim()), 200);
  }

  const results = data?.results ?? [];
  const typed = value.trim();
  const showingAll = !typed && data?.query === "";

  function open(i: number) {
    const target = results[i];
    if (target) window.location.assign(target.url);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && results.length) {
      e.preventDefault();
      setActive((a) => (a + 1) % results.length);
    } else if (e.key === "ArrowUp" && results.length) {
      e.preventDefault();
      setActive((a) => (a <= 0 ? results.length - 1 : a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      open(active >= 0 ? active : 0);
    } else if (e.key === "Escape") {
      if (active >= 0) setActive(-1);
      else onType("");
    }
  }

  const status = failed
    ? "Search is unavailable right now. Try again in a moment."
    : !data
      ? ""
      : showingAll
        ? data.total === 0
          ? ""
          : data.total > results.length
          ? `Showing ${results.length} of ${data.total} colleges. Type to find yours.`
          : `${data.total} ${data.total === 1 ? "college is" : "colleges are"} on NotifyHub.`
        : results.length
          ? `${results.length} ${results.length === 1 ? "suggestion" : "suggestions"}`
          : "";

  return (
    <div>
      <label id={`${id}-label`} htmlFor={`${id}-q`} className="text-[0.9375rem] font-extrabold">
        Students: find your college
      </label>
      <div className="relative mt-2">
        <Search size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-3" aria-hidden="true" />
        <input
          id={`${id}-q`}
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={results.length > 0}
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          aria-describedby={`${id}-status`}
          value={value}
          onChange={(e) => onType(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="College name or short form, e.g. VP or VITS"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="go"
          className="input min-h-12 pr-10 pl-10 text-[1rem]"
        />
        {loading && typed ? (
          <span className="absolute top-1/2 right-3.5 -translate-y-1/2 text-ink-3">
            <Spinner />
            <span className="sr-only">Searching</span>
          </span>
        ) : null}
      </div>

      <p id={`${id}-status`} aria-live="polite" className={status ? "meta mt-2" : "sr-only"}>
        {status}
      </p>

      {results.length ? (
        <ul
          id={listId}
          role="listbox"
          aria-labelledby={`${id}-label`}
          className={`mt-2 max-h-[22rem] divide-y divide-line overflow-y-auto rounded-lg border border-line bg-surface ${loading && typed ? "opacity-60" : ""}`}
        >
          {results.map((c, i) => (
            <li key={c.url} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
              <Link
                href={c.url}
                tabIndex={-1}
                onMouseEnter={() => setActive(i)}
                className={`flex items-center gap-3 px-3.5 py-3 ${i === active ? "bg-sunken" : "hover:bg-sunken"}`}
              >
                <CollegeMark name={c.name} shortName={c.shortName} logoUrl={c.logoUrl} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block leading-snug font-bold">
                    <Highlight text={c.name} query={showingAll ? "" : typed} />
                    {c.shortName ? (
                      <span className="ml-2 rounded-xs border border-line px-1.5 py-0.5 align-middle text-[0.6875rem] font-bold text-ink-2">
                        <Highlight text={c.shortName} query={showingAll ? "" : typed} />
                      </span>
                    ) : null}
                    {c.isDemo ? <span className="ml-1.5 rounded-xs bg-sunken px-1.5 py-0.5 align-middle text-[0.6875rem] font-bold text-ink-2">Demo</span> : null}
                  </span>
                  <span className="block truncate text-[0.8125rem] text-ink-3">{[c.place, c.host].filter(Boolean).join(" · ")}</span>
                </span>
                <ArrowRight size={18} className="shrink-0 text-ink-3" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      ) : data && typed && !loading && data.query === typed ? (
        <div className="mt-2 rounded-lg border border-line bg-sunken px-4 py-3 text-[0.9375rem]">
          <p className="font-bold">No college matching “{typed}” is on NotifyHub yet.</p>
          <p className="mt-1 text-ink-2">
            Check the spelling or try the short form. Colleges join by connecting their official website, so ask your college office to{" "}
            <Link href="/connect-college" className="link">connect the college</Link>.
          </p>
        </div>
      ) : null}
    </div>
  );
}

async function fetchColleges(q: string, signal: AbortSignal) {
  const res = await fetch(`/api/colleges/search?q=${encodeURIComponent(q)}`, { signal });
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()) as { results: CollegeSearchResult[]; total: number };
}

/** Bolds the part of `text` that matches what was typed, e.g. "VP" in "VP College ...". */
function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-xs bg-brand-tint px-0.5 text-inherit">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}
