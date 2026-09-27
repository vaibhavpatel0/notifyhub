"use client";

import { useEffect, useRef, useState } from "react";
import { Share2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/** Counts one view per browser session per notice. No personal data is stored. */
export function ViewRecorder({ id }: { id: string }) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const key = `nh:viewed:${id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
    createClient().rpc("record_announcement_view", { p_id: id }).then(() => undefined);
  }, [id]);
  return null;
}

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn-secondary btn-sm"
      onClick={async () => {
        const url = window.location.href;
        if (navigator.share) {
          try {
            await navigator.share({ title, url });
            return;
          } catch {
            /* cancelled: fall back to copying */
          }
        }
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
    >
      <Share2 size={15} aria-hidden="true" />
      {copied ? "Link copied" : "Share"}
    </button>
  );
}
