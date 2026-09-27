"use client";

import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Check, CircleAlert, Copy, X } from "lucide-react";
import { FieldError, FormMessage } from "@/components/ui/FormMessage";
import { Spinner, SubmitButton } from "@/components/ui/SubmitButton";
import { ROOT_DOMAIN, USE_SUBDOMAINS } from "@/lib/env";
import { STAGES, type AnalysisSummary, type WizardState } from "@/lib/onboarding/state";
import type { ActionResult } from "@/lib/types";
import {
  checkOwnership,
  checkSlugAvailability,
  chooseSlug,
  createCollegeAccount,
  requestManualReview,
  saveReviewedDetails,
  sendVerificationCode,
  startOnboarding,
  suggestSlugs,
  verifyCode,
} from "./actions";

type Step = "details" | "analysis" | "review" | "verify" | "slug" | "account" | "done";

function stepFor(state: WizardState | null): Step {
  if (!state) return "details";
  const s = state.stage;
  if (s <= 1) return "analysis";
  if (s === 2) return "review";
  if (s <= 4) return "verify";
  if (s === 5) return "slug";
  if (s === 6) return "account";
  return "done";
}

/** Which of the 8 published stages is "current" for the progress rail. */
function railIndex(step: Step, state: WizardState | null) {
  switch (step) {
    case "details": return 0;
    case "analysis": return 1;
    case "review": return 2;
    case "verify": return state && state.stage >= 4 ? 3 : 2;
    case "slug": return 5;
    case "account": return 6;
    case "done": return state?.portal?.published ? 8 : 7;
  }
}

const host = (slug: string) => (USE_SUBDOMAINS ? `${slug}.${ROOT_DOMAIN}` : `${ROOT_DOMAIN}/s/${slug}`);

export function Wizard({ initial, preferredSlug }: { initial: WizardState | null; preferredSlug: string | null }) {
  const [state, setState] = useState<WizardState | null>(initial);
  const [step, setStep] = useState<Step>(stepFor(initial));
  const [flash, setFlash] = useState<string | null>(null);

  const advance = useCallback((next: WizardState, message?: string) => {
    setState(next);
    setStep(stepFor(next));
    setFlash(message ?? null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const current = railIndex(step, state);

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
      <ProgressRail current={current} />
      <section className="panel min-w-0 p-5 sm:p-8" aria-live="polite">
        {flash ? (
          <p role="status" className="mb-6 rounded-md border border-ok/30 bg-ok-tint px-3 py-2 text-[0.9375rem] font-bold text-ok">
            {flash}
          </p>
        ) : null}
        {step === "details" && <DetailsStep onDone={advance} />}
        {step === "analysis" && state && <AnalysisStep state={state} onDone={(s) => advance(s)} />}
        {step === "review" && state && <ReviewStep state={state} onDone={advance} />}
        {step === "verify" && state && <VerifyStep state={state} onDone={advance} onUpdate={setState} />}
        {step === "slug" && state && <SlugStep state={state} preferred={preferredSlug} onDone={advance} />}
        {step === "account" && state && <AccountStep state={state} onDone={advance} />}
        {step === "done" && state && <DoneStep state={state} />}
      </section>
    </div>
  );
}

function ProgressRail({ current }: { current: number }) {
  return (
    <nav aria-label="Onboarding progress">
      <p className="text-[0.875rem] font-bold text-ink-2 lg:hidden">
        Step {Math.min(current + 1, STAGES.length)} of {STAGES.length}: {STAGES[Math.min(current, STAGES.length - 1)]}
      </p>
      <div className="mt-2 h-1.5 rounded-full bg-line lg:hidden">
        <div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${(Math.min(current, 8) / 8) * 100}%` }} />
      </div>
      <ol className="hidden lg:block">
        {STAGES.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={label} className="relative flex gap-3 pb-5 last:pb-0">
              {i < STAGES.length - 1 ? (
                <span className={`absolute top-6 left-[11px] h-[calc(100%-20px)] w-0.5 ${done ? "bg-brand" : "bg-line"}`} aria-hidden="true" />
              ) : null}
              <span
                className={`relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-[0.75rem] font-extrabold ${
                  done ? "border-brand bg-brand text-white" : active ? "border-brand bg-surface text-brand" : "border-line-strong bg-surface text-ink-3"
                }`}
              >
                {done ? <Check size={13} strokeWidth={3} aria-hidden="true" /> : i + 1}
              </span>
              <span className={`pt-0.5 text-[0.9375rem] ${active ? "font-extrabold text-ink" : done ? "font-bold text-ink-2" : "text-ink-3"}`}>
                {label}
                {done ? <span className="sr-only"> (done)</span> : active ? <span className="sr-only"> (current)</span> : null}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ---------------------------------------------------------------------------

function DetailsStep({ onDone }: { onDone: (s: WizardState) => void }) {
  const [result, action] = useActionState(startOnboarding, null);
  useEffect(() => {
    if (result?.ok && result.data) onDone(result.data);
  }, [result, onDone]);
  return (
    <form action={action} className="space-y-5" noValidate>
      <header>
        <h2 className="hd-2">College details</h2>
        <p className="mt-1 text-ink-2">Use the college&apos;s official website, not a social media page.</p>
      </header>
      <FormMessage state={result?.ok ? null : result} />
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="field-label">College name</span>
          <input name="collegeName" className="input" required autoComplete="organization" placeholder="Full name as on the official website" />
          <FieldError state={result} name="collegeName" />
        </label>
        <label className="sm:col-span-2">
          <span className="field-label">Official college website</span>
          <input name="website" className="input" required inputMode="url" autoComplete="url" placeholder="https://www.yourcollege.ac.in" />
          <span className="field-hint">We read only public pages, and we respect the site&apos;s robots.txt.</span>
          <FieldError state={result} name="website" />
        </label>
        <label>
          <span className="field-label">Your name</span>
          <input name="contactName" className="input" required autoComplete="name" />
          <FieldError state={result} name="contactName" />
        </label>
        <label>
          <span className="field-label">Your email</span>
          <input name="contactEmail" type="email" className="input" required autoComplete="email" />
          <FieldError state={result} name="contactEmail" />
        </label>
        <label>
          <span className="field-label">
            Contact number <span className="font-normal text-ink-3">(optional)</span>
          </span>
          <input name="contactPhone" type="tel" className="input" autoComplete="tel" placeholder="+91 98765 43210" />
          <FieldError state={result} name="contactPhone" />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <SubmitButton pendingLabel="Starting">Analyse website</SubmitButton>
        <p className="text-[0.8125rem] text-ink-3">Nothing is published until your college is verified.</p>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------

type StepKey = "reachable" | "robots" | "name" | "logo" | "contact" | "email" | "departments";
type CheckState = { status: "pending" | "ok" | "warn" | "fail"; detail?: string };
const CHECK_ORDER: StepKey[] = ["reachable", "robots", "name", "logo", "contact", "email", "departments"];

function AnalysisStep({ state, onDone }: { state: WizardState; onDone: (s: WizardState) => void }) {
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [checks, setChecks] = useState<Record<string, CheckState>>({});
  const [page, setPage] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        const res = await fetch("/api/onboarding/analyze", { method: "POST" });
        if (!res.ok || !res.body) {
          const body = await res.json().catch(() => ({}));
          setError(body.error ?? "The analysis could not start.");
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            const ev = JSON.parse(line);
            if (ev.type === "labels") setLabels(ev.labels);
            else if (ev.type === "page") setPage(ev.url);
            else if (ev.type === "step") setChecks((c) => ({ ...c, [ev.key]: { status: ev.status, detail: ev.detail } }));
            else if (ev.type === "result") setResult(ev.result);
            else if (ev.type === "error") setError(ev.message);
          }
        }
      } catch {
        setError("The connection dropped during the analysis. You can continue and enter the details yourself.");
      } finally {
        setPage(null);
      }
    })();
  }, []);

  const finished = Boolean(result || error);
  const failed = result && result.status !== "completed";
  const continueWith = () =>
    onDone({ ...state, stage: 2, analysis: result ?? state.analysis });

  return (
    <div>
      <h2 className="hd-2">{finished ? (failed || error ? "Analysis finished with problems" : "College detected") : "Analysing college website"}</h2>
      <p className="mt-1 break-all text-ink-2">{state.college.website}</p>

      <ul className="mt-6 divide-y divide-line rounded-md border border-line">
        {CHECK_ORDER.map((key) => {
          const c = checks[key] ?? { status: finished ? "warn" : "pending" };
          if (finished && !checks[key] && (failed || error)) return null;
          return (
            <li key={key} className="flex items-start gap-3 px-4 py-3">
              <CheckIcon status={c.status} />
              <div className="min-w-0">
                <p className="font-bold">{labels[key] ?? key}</p>
                {c.detail ? <p className="truncate text-[0.875rem] text-ink-2">{c.detail}</p> : null}
              </div>
            </li>
          );
        })}
      </ul>
      {page ? <p className="meta mt-3 truncate">Reading {page.replace(/^https?:\/\//, "")}</p> : null}

      {error || failed ? (
        <div className="mt-6 rounded-md border border-new/30 bg-new-tint p-4">
          <p className="font-bold text-ink">{error ?? result?.error}</p>
          <p className="mt-1 text-[0.9375rem] text-ink-2">
            This does not stop your registration. Continue and type the college details yourself, then verify ownership with DNS, a website tag or
            manual review.
          </p>
        </div>
      ) : null}

      {result && !failed ? (
        <dl className="mt-6 grid gap-x-6 gap-y-4 rounded-md bg-sunken p-4 sm:grid-cols-2">
          <Detail label="College" value={result.name ?? state.college.name} />
          <Detail label="Website" value={state.college.website} />
          <Detail label="Suggested official email" value={result.officialEmails[0] ?? "None found on the website"} />
          <Detail label="Detected departments" value={result.departments.length ? result.departments.map((d) => d.code).join(", ") : "None found"} />
        </dl>
      ) : null}

      {finished ? (
        <div className="mt-6 border-t border-line pt-5">
          <button type="button" className="btn-primary" onClick={continueWith}>
            Review details
          </button>
          <p className="mt-2 text-[0.8125rem] text-ink-3">Detected information is a starting point. It does not verify the college.</p>
        </div>
      ) : null}
    </div>
  );
}

function CheckIcon({ status }: { status: CheckState["status"] }) {
  if (status === "pending") return <span className="mt-0.5 text-ink-3"><Spinner size={18} /></span>;
  if (status === "ok") return <span className="mt-0.5 flex size-[18px] items-center justify-center rounded-full bg-ok text-white"><Check size={12} strokeWidth={3} aria-label="Done" /></span>;
  if (status === "warn") return <CircleAlert size={18} className="mt-0.5 shrink-0 text-new" aria-label="Not found" />;
  return <span className="mt-0.5 flex size-[18px] items-center justify-center rounded-full bg-urgent text-white"><X size={12} strokeWidth={3} aria-label="Failed" /></span>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.8125rem] font-bold text-ink-3">{label}</dt>
      <dd className="mt-0.5 break-words font-bold">{value}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------

function ReviewStep({ state, onDone }: { state: WizardState; onDone: (s: WizardState) => void }) {
  const a = state.analysis;
  const detected = a?.departments ?? [];
  const [selected, setSelected] = useState<{ code: string; name: string; on: boolean }[]>(
    (state.departments.length ? state.departments : detected).map((d) => ({ ...d, on: true })),
  );
  const [custom, setCustom] = useState({ code: "", name: "" });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = (fd: FormData) => {
    setError(null);
    start(async () => {
      const res = await saveReviewedDetails({
        name: String(fd.get("name") ?? ""),
        shortName: String(fd.get("shortName") ?? ""),
        description: String(fd.get("description") ?? ""),
        address: String(fd.get("address") ?? ""),
        phone: String(fd.get("phone") ?? ""),
        departments: selected.filter((d) => d.on).map(({ code, name }) => ({ code, name })),
      });
      if (res.ok && res.data) onDone(res.data);
      else if (!res.ok) setError(res.error);
    });
  };

  const addCustom = () => {
    const code = custom.code.trim().toUpperCase();
    const name = custom.name.trim();
    if (!code || name.length < 2 || selected.some((d) => d.code === code)) return;
    setSelected([...selected, { code, name, on: true }]);
    setCustom({ code: "", name: "" });
  };

  return (
    <form action={submit} className="space-y-6">
      <header>
        <h2 className="hd-2">Review the details</h2>
        <p className="mt-1 text-ink-2">Correct anything we got wrong. You can change all of this later from the admin dashboard.</p>
      </header>
      {error ? <FormMessage state={{ ok: false, error }} /> : null}
      <div className="grid gap-5 sm:grid-cols-[1fr_180px]">
        <label>
          <span className="field-label">College name</span>
          <input name="name" className="input" required defaultValue={state.college.name || a?.name || ""} />
        </label>
        <label>
          <span className="field-label">Short name</span>
          <input name="shortName" className="input" maxLength={20} defaultValue={state.college.shortName ?? ""} placeholder="VITS" />
        </label>
        <label className="sm:col-span-2">
          <span className="field-label">Short description</span>
          <textarea name="description" className="input min-h-24" maxLength={600} defaultValue={state.college.description ?? a?.description ?? ""} />
        </label>
        <label>
          <span className="field-label">Address</span>
          <input name="address" className="input" maxLength={400} defaultValue={state.college.address ?? a?.address ?? ""} />
        </label>
        <label>
          <span className="field-label">Phone</span>
          <input name="phone" className="input" maxLength={40} defaultValue={state.college.phone ?? a?.phones[0] ?? ""} />
        </label>
      </div>

      <fieldset>
        <legend className="field-label">Departments</legend>
        <p className="field-hint mt-0 mb-3">
          {detected.length ? "Found on your website. Untick any that are wrong." : "None were found automatically. Add your departments below or later from the dashboard."}
        </p>
        {selected.length ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            {selected.map((d, i) => (
              <li key={d.code}>
                <label className="flex cursor-pointer items-center gap-3 rounded-md border border-line px-3 py-2.5 has-[:checked]:border-brand has-[:checked]:bg-brand-tint">
                  <input
                    type="checkbox"
                    className="size-4 accent-brand"
                    checked={d.on}
                    onChange={(e) => setSelected(selected.map((x, j) => (j === i ? { ...x, on: e.target.checked } : x)))}
                  />
                  <span className="min-w-12 font-extrabold">{d.code}</span>
                  <span className="truncate text-[0.9375rem] text-ink-2">{d.name}</span>
                </label>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <input className="input w-28" placeholder="Code" aria-label="New department code" value={custom.code} maxLength={12} onChange={(e) => setCustom({ ...custom, code: e.target.value })} />
          <input className="input min-w-48 flex-1" placeholder="Department name" aria-label="New department name" value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }} />
          <button type="button" className="btn-secondary" onClick={addCustom}>Add</button>
        </div>
      </fieldset>

      <div className="border-t border-line pt-5">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? <><Spinner />Saving</> : "Continue to verification"}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------

type Method = "email" | "dns" | "meta" | "manual";

function VerifyStep({ state, onDone, onUpdate }: { state: WizardState; onDone: (s: WizardState, m?: string) => void; onUpdate: (s: WizardState) => void }) {
  const official = state.analysis?.officialEmails ?? [];
  const [method, setMethod] = useState<Method>("email");
  const methods: { key: Method; label: string; hint: string }[] = [
    { key: "email", label: "Official email", hint: official.length ? "Recommended" : `Any @${state.college.domain} address` },
    { key: "dns", label: "DNS record", hint: "For your IT team" },
    { key: "meta", label: "Website tag", hint: "Edit the home page" },
    { key: "manual", label: "Manual review", hint: "A person checks" },
  ];

  return (
    <div>
      <h2 className="hd-2">Verify that you represent the college</h2>
      <p className="mt-1 text-ink-2">
        NotifyHub only creates a public portal after the college confirms ownership. Information found on the website is not enough by itself.
      </p>

      <div role="tablist" aria-label="Verification method" className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {methods.map((m) => (
          <button
            key={m.key}
            type="button"
            role="tab"
            aria-selected={method === m.key}
            onClick={() => setMethod(m.key)}
            className={`rounded-md border px-3 py-2.5 text-left transition-colors ${method === m.key ? "border-brand bg-brand-tint" : "border-line hover:border-line-strong"}`}
          >
            <span className="block font-bold">{m.label}</span>
            <span className="block text-[0.8125rem] text-ink-2">{m.hint}</span>
          </button>
        ))}
      </div>

      <div className="mt-6" role="tabpanel">
        {method === "email" && <EmailVerification state={state} onDone={onDone} onUpdate={onUpdate} />}
        {method === "dns" && (
          <TokenVerification
            method="dns"
            onDone={onDone}
            intro="Ask whoever manages your domain to add this TXT record. It proves control of the domain without changing your website."
            rows={[
              ["Type", "TXT"],
              ["Host / name", state.verification.dnsHost],
              ["Value", state.verification.dnsValue],
            ]}
          />
        )}
        {method === "meta" && (
          <TokenVerification
            method="meta"
            onDone={onDone}
            intro={`Add this tag inside the <head> of the home page at ${state.college.website}. You can remove it after verification.`}
            rows={[["Tag", state.verification.metaTag]]}
          />
        )}
        {method === "manual" && <ManualVerification onDone={onDone} />}
      </div>
    </div>
  );
}

function EmailVerification({ state, onDone, onUpdate }: { state: WizardState; onDone: (s: WizardState, m?: string) => void; onUpdate: (s: WizardState) => void }) {
  const official = state.analysis?.officialEmails ?? [];
  const [choice, setChoice] = useState<string>(state.verification.email ?? official[0] ?? "other");
  const [other, setOther] = useState(state.verification.email && !official.includes(state.verification.email) ? state.verification.email : "");
  const [sentTo, setSentTo] = useState<string | null>(state.stage === 4 ? state.verification.email : null);
  const [devLogged, setDevLogged] = useState(false);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<ActionResult<unknown> | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const email = choice === "other" ? other.trim() : choice;
  const send = () =>
    start(async () => {
      setMsg(null);
      const res = await sendVerificationCode(email);
      if (res.ok && res.data) {
        setSentTo(email);
        setDevLogged(res.data.devLogged);
        setCooldown(60);
        onUpdate(res.data.state);
        setMsg({ ok: true, message: res.message });
      } else setMsg(res);
    });
  const verify = () =>
    start(async () => {
      setMsg(null);
      const res = await verifyCode(code);
      if (res.ok && res.data) onDone(res.data, res.message);
      else setMsg(res);
    });

  if (sentTo) {
    return (
      <div className="max-w-md">
        <h3 className="hd-3">Verify official college email</h3>
        <p className="mt-1 text-ink-2">
          Enter the 6-digit code sent to <strong className="text-ink">{sentTo}</strong>. It expires in 10 minutes.
        </p>
        {devLogged ? (
          <p className="mt-3 rounded-md bg-sunken px-3 py-2 text-[0.875rem] text-ink-2">
            Development mode: email is not configured, so the code was printed in the server log.
          </p>
        ) : null}
        <div className="mt-4 space-y-3">
          <FormMessage state={msg} />
          <label className="block">
            <span className="field-label">Verification code</span>
            <input
              className="input max-w-48 text-center text-[1.375rem] font-extrabold tracking-[0.4em]"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => { if (e.key === "Enter" && code.length === 6) verify(); }}
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-primary" disabled={pending || code.length !== 6} onClick={verify}>
              {pending ? <><Spinner />Checking</> : "Verify email"}
            </button>
            <button type="button" className="btn-ghost btn-sm" disabled={pending || cooldown > 0} onClick={send}>
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
            </button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => { setSentTo(null); setCode(""); setMsg(null); }}>
              Use another address
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-4">
      <FormMessage state={msg} />
      <fieldset className="space-y-2">
        <legend className="field-label">Send a code to</legend>
        {official.map((e) => (
          <label key={e} className="flex cursor-pointer items-center gap-3 rounded-md border border-line px-3 py-2.5 has-[:checked]:border-brand has-[:checked]:bg-brand-tint">
            <input type="radio" name="email" className="accent-brand" checked={choice === e} onChange={() => setChoice(e)} />
            <span className="font-bold break-all">{e}</span>
            <span className="ml-auto shrink-0 text-[0.8125rem] text-ink-3">Listed on your website</span>
          </label>
        ))}
        <label className="flex cursor-pointer flex-wrap items-center gap-3 rounded-md border border-line px-3 py-2.5 has-[:checked]:border-brand has-[:checked]:bg-brand-tint">
          <input type="radio" name="email" className="accent-brand" checked={choice === "other"} onChange={() => setChoice("other")} />
          <span className="font-bold">Another address at @{state.college.domain}</span>
          {choice === "other" ? (
            <input
              className="input mt-1 w-full"
              type="email"
              placeholder={`principal@${state.college.domain}`}
              value={other}
              onChange={(e) => setOther(e.target.value)}
              aria-label="Official email address"
            />
          ) : null}
        </label>
      </fieldset>
      {choice === "other" ? (
        <p className="text-[0.875rem] text-ink-2">
          Addresses not published on your website are verified, then checked by a NotifyHub reviewer before the portal goes public.
        </p>
      ) : null}
      <button type="button" className="btn-primary" disabled={pending || !email} onClick={send}>
        {pending ? <><Spinner />Sending</> : "Send verification code"}
      </button>
    </div>
  );
}

function TokenVerification({ method, intro, rows, onDone }: { method: "dns" | "meta"; intro: string; rows: [string, string][]; onDone: (s: WizardState, m?: string) => void }) {
  const [msg, setMsg] = useState<ActionResult<unknown> | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-ink-2">{intro}</p>
      <dl className="divide-y divide-line rounded-md border border-line">
        {rows.map(([k, v]) => (
          <div key={k} className="grid gap-1 px-4 py-3 sm:grid-cols-[120px_1fr_auto] sm:items-center sm:gap-4">
            <dt className="text-[0.875rem] font-bold text-ink-3">{k}</dt>
            <dd className="font-bold break-all">{v}</dd>
            <CopyButton value={v} />
          </div>
        ))}
      </dl>
      <FormMessage state={msg} />
      <button
        type="button"
        className="btn-primary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setMsg(null);
            const res = await checkOwnership(method);
            if (res.ok && res.data) onDone(res.data, res.message);
            else setMsg(res);
          })
        }
      >
        {pending ? <><Spinner />Checking</> : method === "dns" ? "Check DNS record" : "Check website"}
      </button>
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn-ghost btn-sm justify-self-start"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      <Copy size={14} aria-hidden="true" />
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function ManualVerification({ onDone }: { onDone: (s: WizardState, m?: string) => void }) {
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<ActionResult<unknown> | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="max-w-xl space-y-4">
      <p className="text-ink-2">
        A NotifyHub reviewer will contact the college through its published phone number or email to confirm your request. You can finish setup
        now; the portal becomes public after approval.
      </p>
      <label className="block">
        <span className="field-label">Your role and how we can confirm it</span>
        <textarea className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="I am the IT coordinator. The principal's office can confirm on the number listed on our website." />
      </label>
      <FormMessage state={msg} />
      <button
        type="button"
        className="btn-primary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setMsg(null);
            const res = await requestManualReview(note);
            if (res.ok && res.data) onDone(res.data, res.message);
            else setMsg(res);
          })
        }
      >
        {pending ? <><Spinner />Sending</> : "Request manual review"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------

function VerificationSummary({ state }: { state: WizardState }) {
  const verified = state.college.verificationStatus === "verified";
  const byEmail = state.college.verificationMethod === "email_otp";
  const items: [string, "ok" | "warn"][] = [
    ["Website reachable", state.analysis?.status === "completed" ? "ok" : "warn"],
    ["College information reviewed", "ok"],
    [byEmail ? "Official email verified" : state.college.verificationMethod === "manual" ? "Manual review requested" : "Domain ownership checked", byEmail || verified ? "ok" : "warn"],
    [verified ? "College ownership verified" : "College ownership awaiting NotifyHub review", verified ? "ok" : "warn"],
  ];
  return (
    <ul className="space-y-2">
      {items.map(([label, s]) => (
        <li key={label} className="flex items-center gap-3">
          <CheckIcon status={s} />
          <span className="font-bold">{label}</span>
        </li>
      ))}
    </ul>
  );
}

function SlugStep({ state, preferred, onDone }: { state: WizardState; preferred: string | null; onDone: (s: WizardState) => void }) {
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [takenPreferred, setTakenPreferred] = useState<string | null>(null);
  const [choice, setChoice] = useState<string>("");
  const [custom, setCustom] = useState(preferred ?? "");
  const [customCheck, setCustomCheck] = useState<{ slug: string; available: boolean; reason?: string } | null>(null);
  const [msg, setMsg] = useState<ActionResult<unknown> | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    suggestSlugs().then((res) => {
      if (!res.ok || !res.data) return setMsg(res.ok ? null : res);
      setSuggestions(res.data.suggestions);
      setTakenPreferred(res.data.takenPreferred);
      setChoice(preferred ? "custom" : res.data.suggestions[0] ?? "custom");
    });
  }, [preferred]);

  useEffect(() => {
    if (!custom) return;
    const t = setTimeout(() => checkSlugAvailability(custom).then(setCustomCheck), 350);
    return () => clearTimeout(t);
  }, [custom]);

  const selected = choice === "custom" ? (customCheck?.available ? customCheck.slug : "") : choice;

  return (
    <div className="space-y-6">
      <VerificationSummary state={state} />
      <header className="border-t border-line pt-6">
        <h2 className="hd-2">Choose your portal address</h2>
        <p className="mt-1 text-ink-2">Students will type this address to reach your notices. Keep it short. It cannot be changed later without contacting support.</p>
      </header>
      {takenPreferred ? <p className="text-[0.9375rem] text-ink-2"><strong>{takenPreferred}</strong> is already taken, so here are the closest available options.</p> : null}
      {!suggestions ? (
        <div className="space-y-2" role="status" aria-label="Loading suggestions">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton h-12" />)}
        </div>
      ) : (
        <fieldset className="space-y-2">
          <legend className="sr-only">Available addresses</legend>
          {suggestions.map((s) => (
            <label key={s} className="flex cursor-pointer items-center gap-3 rounded-md border border-line px-3 py-3 has-[:checked]:border-brand has-[:checked]:bg-brand-tint">
              <input type="radio" name="slug" className="accent-brand" checked={choice === s} onChange={() => setChoice(s)} />
              <span className="text-[1.0625rem] break-all">
                <strong>{s}</strong>
                <span className="text-ink-2">{USE_SUBDOMAINS ? `.${ROOT_DOMAIN}` : ""}</span>
              </span>
              <span className="ml-auto shrink-0 text-[0.8125rem] font-bold text-ok">Available</span>
            </label>
          ))}
          <label className="flex cursor-pointer flex-wrap items-center gap-3 rounded-md border border-line px-3 py-3 has-[:checked]:border-brand has-[:checked]:bg-brand-tint">
            <input type="radio" name="slug" className="accent-brand" checked={choice === "custom"} onChange={() => setChoice("custom")} />
            <span className="font-bold">Something else</span>
            {choice === "custom" ? (
              <span className="mt-1 flex w-full items-center gap-2">
                <input className="input" value={custom} onChange={(e) => { setCustom(e.target.value.toLowerCase()); setCustomCheck(null); }} maxLength={40} aria-label="Custom address" placeholder="yourcollege" />
                {USE_SUBDOMAINS ? <span className="shrink-0 text-ink-2">.{ROOT_DOMAIN}</span> : null}
              </span>
            ) : null}
            {choice === "custom" && customCheck ? (
              <span className={`w-full text-[0.875rem] font-bold ${customCheck.available ? "text-ok" : "text-urgent"}`}>
                {customCheck.available ? `${host(customCheck.slug)} is available` : `${customCheck.slug || custom}: ${customCheck.reason}`}
              </span>
            ) : null}
          </label>
        </fieldset>
      )}
      <FormMessage state={msg} />
      <div className="border-t border-line pt-5">
        <button
          type="button"
          className="btn-primary"
          disabled={pending || !selected}
          onClick={() =>
            start(async () => {
              const res = await chooseSlug(selected);
              if (res.ok && res.data) onDone(res.data);
              else setMsg(res);
            })
          }
        >
          {pending ? <><Spinner />Reserving</> : selected ? `Use ${host(selected)}` : "Choose an address"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function AccountStep({ state, onDone }: { state: WizardState; onDone: (s: WizardState, m?: string) => void }) {
  const [result, action] = useActionState(createCollegeAccount, null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (result?.ok && result.data) onDone(result.data, result.message);
  }, [result, onDone]);
  const verifiedEmail = state.college.verificationMethod === "email_otp" ? state.verification.email : null;
  return (
    <form action={action} className="max-w-lg space-y-5" noValidate>
      <header>
        <h2 className="hd-2">Create the college admin account</h2>
        <p className="mt-1 text-ink-2">
          This account manages <strong className="text-ink">{state.college.slug ? host(state.college.slug) : "your portal"}</strong>: the profile,
          departments, notices, events and other admins.
        </p>
      </header>
      <FormMessage state={result?.ok ? null : result} />
      <label className="block">
        <span className="field-label">Full name</span>
        <input name="name" className="input" autoComplete="name" defaultValue={state.contact.name} required />
        <FieldError state={result} name="name" />
      </label>
      <label className="block">
        <span className="field-label">Email</span>
        <input name="email" type="email" className="input" autoComplete="email" defaultValue={verifiedEmail ?? state.contact.email} required />
        <span className="field-hint">
          {verifiedEmail ? "Already verified in the previous step." : "We will send a confirmation link to this address."}
        </span>
        <FieldError state={result} name="email" />
      </label>
      <label className="block">
        <span className="field-label">Password</span>
        <span className="flex gap-2">
          <input name="password" type={show ? "text" : "password"} className="input" autoComplete="new-password" minLength={10} required />
          <button type="button" className="btn-secondary" onClick={() => setShow(!show)} aria-pressed={show}>
            {show ? "Hide" : "Show"}
          </button>
        </span>
        <span className="field-hint">At least 10 characters, with a letter and a number.</span>
        <FieldError state={result} name="password" />
      </label>
      <p className="text-[0.8125rem] text-ink-3">
        By creating the account you agree to the <a className="link" href="/terms">Terms of service</a> and <a className="link" href="/privacy">Privacy policy</a>.
      </p>
      <div className="border-t border-line pt-5">
        <SubmitButton pendingLabel="Creating account">Create account</SubmitButton>
      </div>
    </form>
  );
}

function DoneStep({ state }: { state: WizardState }) {
  const p = state.portal;
  if (!p) return null;
  return (
    <div className="space-y-5">
      <h2 className="hd-2">{p.published ? "Your portal is live" : "Your portal is ready for review"}</h2>
      <p className="text-ink-2">
        {p.published
          ? "Students can open this address now. Add your logo, cover photo and first notices from the admin dashboard."
          : "A NotifyHub reviewer will confirm the college, usually within two working days. You can sign in and prepare notices, events and departments in the meantime; the public will see them once the portal is approved."}
      </p>
      <div className="rounded-md border border-line bg-sunken px-4 py-4">
        <p className="text-[0.8125rem] font-bold text-ink-3">Portal address</p>
        <p className="mt-1 text-[1.375rem] font-extrabold break-all">{p.host}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <a href={p.adminUrl} className="btn-primary">Open admin dashboard</a>
        {p.published ? <a href={p.url} className="btn-secondary">View public portal</a> : null}
      </div>
    </div>
  );
}
