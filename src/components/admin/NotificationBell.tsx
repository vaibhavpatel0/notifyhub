"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { markNotificationsRead } from "@/lib/actions/admin";
import { relativeTime } from "@/lib/format";
import type { NotificationRow } from "@/lib/types";

/** In-app notifications for admins, updated live. Other channels (email, push) can hook into the same table later. */
export function NotificationBell({ userId, initial, linkBase }: { userId: string; initial: NotificationRow[]; linkBase: string }) {
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = items.filter((n) => !n.is_read);

  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel(`notifications:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (p: { new: unknown }) =>
        setItems((cur) => [p.new as NotificationRow, ...cur].slice(0, 20)),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unread.length) {
      markNotificationsRead(unread.map((n) => n.id));
      setItems((cur) => cur.map((n) => ({ ...n, is_read: true })));
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={toggle} className="relative rounded-md p-2 text-ink-2 hover:bg-sunken hover:text-ink" aria-expanded={open} aria-label={`Notifications${unread.length ? `, ${unread.length} unread` : ""}`}>
        <Bell size={20} aria-hidden="true" />
        {unread.length ? (
          <span className="absolute top-0.5 right-0.5 flex min-w-4 items-center justify-center rounded-full bg-urgent px-1 text-[0.6875rem] leading-4 font-extrabold text-white">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-[min(360px,calc(100vw-2rem))] rounded-lg border border-line bg-surface shadow-float">
          <p className="border-b border-line px-4 py-2.5 font-extrabold">Notifications</p>
          {items.length ? (
            <ul className="max-h-96 divide-y divide-line overflow-y-auto">
              {items.map((n) => (
                <li key={n.id} className="px-4 py-3">
                  {n.link ? (
                    <Link href={`${linkBase}${n.link}`} className="font-bold leading-snug hover:underline" onClick={() => setOpen(false)}>{n.title}</Link>
                  ) : (
                    <p className="font-bold leading-snug">{n.title}</p>
                  )}
                  {n.message ? <p className="mt-0.5 text-[0.875rem] text-ink-2">{n.message}</p> : null}
                  <p className="meta mt-1">{relativeTime(n.created_at)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-center text-[0.9375rem] text-ink-3">No notifications yet. You will be told here when departments post or your portal status changes.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
