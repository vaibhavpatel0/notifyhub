"use client";
/* eslint-disable @next/next/no-img-element -- previews of files the admin just uploaded */

import { useId, useRef, useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ATTACHMENT_TYPES, IMAGE_TYPES, STORAGE_BUCKET, UPLOAD_LIMIT_BYTES } from "@/lib/constants";
import { formatBytes } from "@/lib/format";
import { Spinner } from "@/components/ui/SubmitButton";

/**
 * Uploads straight from the browser to Supabase Storage with the admin's own
 * session; the storage policy only accepts files inside this college's folder.
 * The resulting public URL is submitted with the form in a hidden input.
 */
export function FileUpload({
  collegeId,
  kind,
  name,
  label,
  hint,
  defaultUrl,
  defaultFileName,
  variant = "image",
  onChange,
}: {
  collegeId: string;
  kind: "logo" | "cover" | "announcement-image" | "announcement-attachment" | "event-image" | "event-attachment" | "department-image";
  name: string;
  label: string;
  hint?: string;
  defaultUrl?: string | null;
  defaultFileName?: string | null;
  variant?: "image" | "file";
  onChange?: (url: string) => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(defaultUrl ?? "");
  const [fileName, setFileName] = useState(defaultFileName ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const allowed = variant === "image" ? IMAGE_TYPES : ATTACHMENT_TYPES;

  async function onFile(file: File) {
    setError(null);
    if (!allowed.includes(file.type)) {
      setError(variant === "image" ? "Use a PNG, JPG, WebP, GIF or SVG image." : "Use a PDF, Word, Excel, PowerPoint or image file.");
      return;
    }
    if (file.size > UPLOAD_LIMIT_BYTES) {
      setError(`That file is ${formatBytes(file.size)}. The limit is ${formatBytes(UPLOAD_LIMIT_BYTES)}.`);
      return;
    }
    setBusy(true);
    try {
      const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/-+/g, "-").slice(-80);
      const path = `${collegeId}/${kind}/${crypto.randomUUID()}-${safe}`;
      const supabase = createClient();
      const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { contentType: file.type, cacheControl: "31536000" });
      if (upErr) throw upErr;
      const publicUrl = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
      setUrl(publicUrl);
      onChange?.(publicUrl);
      setFileName(file.name);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setError(/row-level|unauthorized|403/i.test(msg) ? "You do not have permission to upload here." : "Upload failed. Check your connection and try again.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <span className="field-label" id={`${id}-label`}>{label}</span>
      <input type="hidden" name={name} value={url} />
      {variant === "file" ? <input type="hidden" name={`${name.replace(/_url$/, "")}_name`} value={fileName} /> : null}
      <div
        className="flex flex-wrap items-center gap-3 rounded-md border border-dashed border-line-strong bg-sunken p-3"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) onFile(f);
        }}
      >
        {url && variant === "image" ? (
          <img src={url} alt="" className="h-16 w-auto max-w-40 rounded-sm border border-line bg-surface object-contain" />
        ) : url ? (
          <span className="inline-flex min-w-0 items-center gap-2 rounded-sm border border-line bg-surface px-2.5 py-1.5 text-[0.875rem] font-bold">
            <FileText size={16} aria-hidden="true" />
            <span className="truncate">{fileName || "Attached file"}</span>
          </span>
        ) : null}
        <input
          ref={input}
          id={id}
          type="file"
          accept={allowed.join(",")}
          className="sr-only"
          aria-labelledby={`${id}-label`}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />
        <button type="button" className="btn-secondary btn-sm" onClick={() => input.current?.click()} disabled={busy}>
          {busy ? <Spinner size={14} /> : <Upload size={14} aria-hidden="true" />}
          {busy ? "Uploading" : url ? "Replace" : "Choose file"}
        </button>
        {url && !busy ? (
          <button type="button" className="btn-ghost btn-sm" onClick={() => { setUrl(""); setFileName(""); onChange?.(""); }}>
            <X size={14} aria-hidden="true" /> Remove
          </button>
        ) : null}
        {!url && !busy ? <span className="text-[0.8125rem] text-ink-3">or drop it here</span> : null}
      </div>
      {error ? <span className="field-error" role="alert">{error}</span> : <span className="field-hint">{hint ?? `Up to ${formatBytes(UPLOAD_LIMIT_BYTES)}.`}</span>}
    </div>
  );
}
