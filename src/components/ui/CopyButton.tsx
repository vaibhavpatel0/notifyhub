"use client";

import { useState } from "react";
import { Copy } from "lucide-react";

export function CopyButton({ value, label = "Copy", className = "btn-ghost btn-sm justify-self-start" }: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      <Copy size={14} aria-hidden="true" />
      {copied ? "Copied" : label}
    </button>
  );
}
