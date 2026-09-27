"use client";

import { useEffect, useState } from "react";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 };
}

/**
 * Live countdown to an event. Renders nothing on the server (the time is
 * only meaningful in the visitor's browser) and then ticks every second.
 */
export function Countdown({ startsAt, endsAt, variant = "inline" }: { startsAt: string; endsAt: string | null; variant?: "inline" | "large" }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  const start = new Date(startsAt).getTime();
  const end = endsAt ? new Date(endsAt).getTime() : start + 3 * 3600_000;

  if (now === null) {
    return variant === "large" ? <div className="h-[76px]" aria-hidden="true" /> : <span className="inline-block h-5 w-28" aria-hidden="true" />;
  }
  if (now >= end) return <span className="text-[0.875rem] font-bold text-ink-3">This event has ended</span>;
  if (now >= start) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[0.875rem] font-extrabold text-ok">
        <span className="size-2 rounded-full bg-ok" aria-hidden="true" /> Happening now
      </span>
    );
  }

  const p = parts(start - now);
  if (variant === "inline") {
    const text = p.days > 0 ? `${p.days}d ${p.hours}h ${p.minutes}m` : `${p.hours}h ${p.minutes}m ${String(p.seconds).padStart(2, "0")}s`;
    return (
      <span className="text-[0.875rem] font-bold tabular-nums" style={{ color: "var(--tenant)" }}>
        Starts in {text}
      </span>
    );
  }

  const cells: [number, string][] = [[p.days, "Days"], [p.hours, "Hours"], [p.minutes, "Minutes"], [p.seconds, "Seconds"]];
  return (
    <div role="timer" aria-label={`Starts in ${p.days} days, ${p.hours} hours, ${p.minutes} minutes`} className="grid max-w-md grid-cols-4 gap-2">
      {cells.map(([n, label]) => (
        <div key={label} className="rounded-md border border-line bg-surface px-2 py-2.5 text-center">
          <span className="block text-[1.75rem] leading-none font-extrabold tabular-nums" aria-hidden="true">
            {String(n).padStart(2, "0")}
          </span>
          <span className="mt-1 block text-[0.75rem] font-bold text-ink-3" aria-hidden="true">{label}</span>
        </div>
      ))}
    </div>
  );
}
