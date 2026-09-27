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
export function NoticeBoard({ items, label }: { items: BoardItem[]; label: string }) {
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
