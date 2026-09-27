"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BellRing, X } from "lucide-react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribes to this college's announcements and events through Supabase
 * Realtime. RLS decides which changes this visitor may receive. On a change
 * the server components re-render (router.refresh), and a new notice is
 * announced in a small banner so students notice it.
 */
export function LiveUpdates({ collegeId, noticeBase }: { collegeId: string; noticeBase: string }) {
  const router = useRouter();
  const [toast, setToast] = useState<{ id: string; title: string; urgent: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const refresh = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 600);
    };
    const channel = supabase
      .channel(`college:${collegeId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements", filter: `college_id=eq.${collegeId}` }, (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        const row = payload.new as { id?: string; title?: string; is_urgent?: boolean; status?: string; published_at?: string } | null;
        if (payload.eventType === "INSERT" && row?.id && row.status === "published" && (!row.published_at || new Date(row.published_at) <= new Date())) {
          setToast({ id: row.id, title: row.title ?? "New notice", urgent: Boolean(row.is_urgent) });
        }
        refresh();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "events", filter: `college_id=eq.${collegeId}` }, refresh)
      .subscribe();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
  }, [collegeId, router]);

  if (!toast) return null;
  return (
    <div className="fixed inset-x-3 bottom-3 z-40 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[380px]" role="status" aria-live="polite">
      <div className={`flex items-start gap-3 rounded-lg border bg-surface p-3.5 shadow-float ${toast.urgent ? "border-urgent/50" : "border-line-strong"}`}>
        <BellRing size={18} className={`mt-0.5 shrink-0 ${toast.urgent ? "text-urgent" : ""}`} style={toast.urgent ? undefined : { color: "var(--tenant)" }} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-[0.8125rem] font-bold text-ink-3">{toast.urgent ? "Urgent notice just posted" : "New notice just posted"}</p>
          <Link href={`${noticeBase}/${toast.id}`} className="mt-0.5 block font-bold leading-snug hover:underline" onClick={() => setToast(null)}>
            {toast.title}
          </Link>
        </div>
        <button type="button" onClick={() => setToast(null)} className="rounded-sm p-1 text-ink-3 hover:bg-sunken hover:text-ink" aria-label="Dismiss">
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
