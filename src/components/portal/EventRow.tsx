import Link from "next/link";
import { MapPin } from "lucide-react";
import { DeptTag } from "@/components/ui/Badges";
import { dateParts, formatDate, formatTime } from "@/lib/format";
import { Countdown } from "./Countdown";

export interface EventRowData {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  venue: string | null;
  countdown_enabled: boolean;
  department?: { code: string; name: string } | null;
}

export function EventRow({ e, href, tz, compact = false }: { e: EventRowData; href: string; tz: string; compact?: boolean }) {
  const d = dateParts(e.starts_at, tz);
  return (
    <article className="relative flex gap-3.5 p-4 sm:px-5">
      <div
        className="flex w-14 shrink-0 flex-col items-center justify-center self-start rounded-md py-2"
        style={{ background: "var(--tenant-tint)", color: "var(--tenant-strong)" }}
      >
        <span className="text-[0.75rem] font-bold">{d.weekday}</span>
        <span className="text-[1.375rem] leading-none font-extrabold">{d.day}</span>
        <span className="text-[0.75rem] font-bold">{d.month}</span>
      </div>
      <div className="min-w-0 flex-1">
        {e.department ? (
          <div className="mb-1">
            <DeptTag code={e.department.code} name={e.department.name} />
          </div>
        ) : null}
        <h3 className="text-[1.0625rem] leading-snug font-bold">
          <Link href={href} className="after:absolute after:inset-0 hover:underline">
            {e.title}
          </Link>
        </h3>
        <p className="meta mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <span>
            {formatTime(e.starts_at, tz)}
            {e.ends_at
              ? formatDate(e.ends_at, tz) === formatDate(e.starts_at, tz)
                ? ` to ${formatTime(e.ends_at, tz)}`
                : ` to ${formatTime(e.ends_at, tz)}, ${formatDate(e.ends_at, tz)}`
              : ""}
          </span>
          {e.venue && !compact ? (
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} aria-hidden="true" />
              {e.venue}
            </span>
          ) : null}
        </p>
        {e.countdown_enabled ? (
          <div className="mt-1.5">
            <Countdown startsAt={e.starts_at} endsAt={e.ends_at} />
          </div>
        ) : null}
      </div>
    </article>
  );
}
