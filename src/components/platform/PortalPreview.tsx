import { BellRing, CalendarDays, MapPin } from "lucide-react";
import { ROOT_DOMAIN } from "@/lib/env";

/**
 * A static rendering of the real portal components with sample content,
 * used on the landing page to show what students see. Clearly labelled as sample data.
 */
export function PortalPreview() {
  return (
    <figure className="overflow-hidden rounded-lg border border-line-strong bg-surface shadow-float">
      <div className="flex items-center gap-2 border-b border-line bg-sunken px-3 py-2">
        <span className="flex gap-1" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-line-strong" />
          <span className="size-2.5 rounded-full bg-line-strong" />
          <span className="size-2.5 rounded-full bg-line-strong" />
        </span>
        <span className="flex-1 truncate rounded-sm bg-surface px-2.5 py-1 text-[0.8125rem] font-bold text-ink-2">
          yourcollege.{ROOT_DOMAIN}
        </span>
      </div>
      <div className="flex items-center gap-3 bg-[#1f4e8c] px-4 py-3 text-white">
        <span className="flex size-9 items-center justify-center rounded-sm bg-white/15 text-[0.8125rem] font-extrabold">YC</span>
        <div>
          <p className="font-extrabold leading-tight">Your College of Engineering</p>
          <p className="text-[0.8125rem] text-white/75">Notices and events</p>
        </div>
      </div>
      <div className="space-y-3 p-4">
        <div className="rounded-md border border-urgent/35 bg-urgent-tint p-3">
          <p className="flex items-center gap-1.5 text-[0.8125rem] font-extrabold text-urgent">
            <BellRing size={14} aria-hidden="true" /> Urgent
          </p>
          <p className="mt-1 font-bold">Mid-term examination timetable released</p>
          <p className="meta mt-0.5">Examination, posted 2 hours ago</p>
        </div>
        <ul className="divide-y divide-line rounded-md border border-line">
          {[
            ["Placement drive registration open", "Placement", "Yesterday"],
            ["CSE: Lab record submission", "Academic", "2 days ago"],
            ["College closed on account of a public holiday", "Holiday", "3 days ago"],
          ].map(([t, c, d]) => (
            <li key={t} className="px-3 py-2.5">
              <p className="text-[0.9375rem] font-bold leading-snug">{t}</p>
              <p className="meta">{c}, {d}</p>
            </li>
          ))}
        </ul>
        <div className="flex gap-3 rounded-md border border-line p-3">
          <div className="flex w-12 shrink-0 flex-col items-center justify-center rounded-sm bg-brand-tint py-1.5 text-brand">
            <span className="text-[1.125rem] leading-none font-extrabold">14</span>
            <span className="text-[0.75rem] font-bold">Oct</span>
          </div>
          <div className="min-w-0">
            <p className="font-bold leading-snug">Department hackathon</p>
            <p className="meta flex items-center gap-1"><MapPin size={12} aria-hidden="true" /> Seminar hall</p>
            <p className="mt-1 flex items-center gap-1 text-[0.8125rem] font-bold text-brand tabular-nums">
              <CalendarDays size={12} aria-hidden="true" /> Starts in 2d 14h 35m
            </p>
          </div>
        </div>
      </div>
      <figcaption className="border-t border-line bg-sunken px-4 py-2 text-[0.75rem] text-ink-3">
        Illustration with sample data
      </figcaption>
    </figure>
  );
}
