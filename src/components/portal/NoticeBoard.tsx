"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { BellRing, CalendarDays, Megaphone } from "lucide-react";
import { SUPABASE_URL } from "@/lib/env";

export interface BoardItem {
  key: string;
  kind: "notice" | "event";
  title: string;
  href: string;
  image: string | null;
  /** "Examination", "Event" ... */
  eyebrow: string;
  /** "Posted 2 days ago", "Tue 30 Sept, 9:00 am" ... */
  when: string;
  /** Short date for the chip on narrow panels, e.g. "30 Sept". */
  chip: string;
  urgent: boolean;
  /** Department slug, or null for a college-wide ("General") notice or event. */
  dept: string | null;
}

export interface BoardDepartment {
  slug: string;
  code: string;
  name: string;
}

type Filter = "all" | "general" | string;

/** Most cards shown at once; filtering picks the newest for that department. */
const MAX_CARDS = 6;

/**
 * Notice board with department buttons: All, General (college-wide) and one per
 * department. Choosing one narrows the cards to that department's notices and
 * events. The cards are re-mounted per filter so the first card opens again.
 */
export function NoticeBoard({
  items,
  departments,
  departmentHref,
  label,
}: {
  items: BoardItem[];
  departments: BoardDepartment[];
  /** Base path of department pages, e.g. /s/vits/departments */
  departmentHref: string;
  label: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const count = (f: Filter) => items.filter((it) => matches(it, f)).length;
  const shown = items.filter((it) => matches(it, filter)).slice(0, MAX_CARDS);
  const dept = departments.find((d) => d.slug === filter);
  const options: { value: Filter; label: string; title: string }[] = [
    { value: "all", label: "All", title: "Every notice and event" },
    { value: "general", label: "General", title: "College-wide notices and events" },
    ...departments.map((d) => ({ value: d.slug, label: d.code, title: d.name })),
  ];

  return (
    <div>
      <div role="group" aria-label="Show notices from" className="-mx-4 mb-3 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex w-max gap-1.5 sm:w-auto sm:flex-wrap">
          {options.map((o) => {
            const on = filter === o.value;
            const n = count(o.value);
            return (
              <button
                key={o.value}
                type="button"
                title={o.title}
                aria-pressed={on}
                onClick={() => setFilter(o.value)}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-md border px-3 text-[0.875rem] font-bold whitespace-nowrap ${
                  on ? "border-transparent text-white" : "border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink"
                }`}
                style={on ? { background: "var(--tenant)" } : undefined}
              >
                {o.label}
                <span className={`rounded-xs px-1 text-[0.75rem] tabular-nums ${on ? "bg-white/20" : "bg-sunken text-ink-3"}`}>{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      {shown.length ? (
        <BoardCards key={filter} items={shown} label={dept ? `${label}: ${dept.name}` : label} />
      ) : (
        <div className="nb-empty !min-h-[160px]">
          <p className="text-[1.0625rem] font-extrabold">
            {dept ? `Nothing from ${dept.code} on the board right now` : "No college-wide notices right now"}
          </p>
          <p className="mt-1 text-white/85">Try another department, or choose All.</p>
        </div>
      )}

      {dept ? (
        <p className="mt-3 text-[0.9375rem]">
          <Link href={`${departmentHref}/${dept.slug}`} className="font-bold hover:underline" style={{ color: "var(--tenant)" }}>
            Every {dept.code} notice and event
          </Link>
        </p>
      ) : null}
    </div>
  );
}

function matches(item: BoardItem, filter: Filter) {
  if (filter === "all") return true;
  if (filter === "general") return item.dept === null;
  return item.dept === filter;
}

/**
 * The portal's notice board: the latest notices and upcoming events as a row of
 * panels. The panel under the pointer (or keyboard focus) widens and shows its
 * caption; the others narrow and fade to grey. On phones the panels stack and the
 * first tap opens a panel, the second follows the link.
 *
 * Built on CSS transitions (no animation library) so it adds almost nothing to
 * the page weight. Motion is switched off for people who ask for reduced motion.
 */
function BoardCards({ items, label }: { items: BoardItem[]; label: string }) {
  const [active, setActive] = useState(0);
  const links = useRef<(HTMLAnchorElement | null)[]>([]);
  // Panel touched while still closed: that tap only opens it (focus fires before click, so check at touch-down).
  const openingByTouch = useRef<number | null>(null);
  const count = items.length;
  // Share of the row taken by the open panel, as a flex-grow value for the others' 1.
  const ratio = 0.5;
  const grow = count > 1 ? (ratio * (count - 1)) / (1 - ratio) : 1;

  function focusPanel(i: number) {
    const next = (i + count) % count;
    setActive(next);
    links.current[next]?.focus();
  }

  return (
    <ul className="notice-board" aria-label={label} style={{ "--nb-grow": grow } as React.CSSProperties}>
      {items.map((item, i) => {
        const isActive = i === active;
        const tilt = isActive ? 0 : i < active ? 5 : -5;
        const Icon = item.urgent ? BellRing : item.kind === "event" ? CalendarDays : Megaphone;
        return (
          <li
            key={item.key}
            className="nb-panel"
            data-active={isActive || undefined}
            data-urgent={item.urgent || undefined}
            style={{ "--nb-tilt": `${tilt}deg`, "--nb-shade": `${78 - (i % 3) * 12}%` } as React.CSSProperties}
          >
            <Link
              ref={(el) => {
                links.current[i] = el;
              }}
              href={item.href}
              className="nb-link"
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onPointerDown={(e) => {
                openingByTouch.current = e.pointerType !== "mouse" && !isActive ? i : null;
              }}
              onClick={(e) => {
                // Touch screens have no hover: the first tap opens the panel, the second follows the link.
                if (openingByTouch.current === i) {
                  e.preventDefault();
                  openingByTouch.current = null;
                  setActive(i);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                  e.preventDefault();
                  focusPanel(i + 1);
                } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                  e.preventDefault();
                  focusPanel(i - 1);
                }
              }}
            >
              <span className="nb-media" aria-hidden="true">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 100vw, 50vw"
                    unoptimized={!item.image.startsWith(`${SUPABASE_URL}/storage/v1/object/public/`)}
                    className="object-cover"
                  />
                ) : (
                  <Icon className="nb-icon" strokeWidth={1.5} />
                )}
              </span>
              <span className="nb-scrim" aria-hidden="true" />
              <span className="nb-chip">
                <span className="nb-chip-kind">{item.urgent ? "Urgent" : item.kind === "event" ? "Event" : "Notice"} · </span>
                {item.chip}
              </span>
              <span className="nb-caption">
                <span className="nb-bar" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="nb-eyebrow">{item.eyebrow}</span>
                  <span className="nb-title">{item.title}</span>
                  <span className="nb-when">{item.when}</span>
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
