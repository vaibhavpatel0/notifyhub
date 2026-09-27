import { BellRing } from "lucide-react";
import { categoryLabel } from "@/lib/constants";

export function UrgentBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-xs bg-urgent px-1.5 py-0.5 text-[0.75rem] font-extrabold tracking-wide text-white">
      <BellRing size={12} strokeWidth={2.5} aria-hidden="true" />
      {compact ? "Urgent" : "Urgent"}
    </span>
  );
}

export function NewBadge() {
  return (
    <span className="inline-flex items-center rounded-xs bg-new-tint px-1.5 py-0.5 text-[0.75rem] font-bold text-new">New</span>
  );
}

export function CategoryTag({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center rounded-xs border border-line px-1.5 py-0.5 text-[0.75rem] font-bold text-ink-2">
      {categoryLabel(value)}
    </span>
  );
}

export function DeptTag({ code, name }: { code: string; name?: string }) {
  return (
    <span
      title={name}
      className="inline-flex items-center rounded-xs px-1.5 py-0.5 text-[0.75rem] font-extrabold tracking-wide"
      style={{ background: "var(--tenant-tint)", color: "var(--tenant-strong)" }}
    >
      {code}
    </span>
  );
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-ok-tint text-ok",
  verified: "bg-ok-tint text-ok",
  published: "bg-ok-tint text-ok",
  pending: "bg-new-tint text-new",
  pending_review: "bg-new-tint text-new",
  manual_review: "bg-new-tint text-new",
  onboarding: "bg-sunken text-ink-2",
  draft: "bg-sunken text-ink-2",
  scheduled: "bg-brand-tint text-brand",
  expired: "bg-sunken text-ink-3",
  archived: "bg-sunken text-ink-3",
  hidden: "bg-sunken text-ink-3",
  disabled: "bg-sunken text-ink-3",
  upcoming: "bg-brand-tint text-brand",
  live: "bg-ok-tint text-ok",
  ended: "bg-sunken text-ink-3",
  suspended: "bg-urgent-tint text-urgent",
  rejected: "bg-urgent-tint text-urgent",
};

const STATUS_LABELS: Record<string, string> = {
  pending_review: "Awaiting review",
  manual_review: "Manual review",
  onboarding: "Onboarding",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-xs px-1.5 py-0.5 text-[0.75rem] font-bold whitespace-nowrap ${STATUS_STYLES[status] ?? "bg-sunken text-ink-2"}`}>
      {STATUS_LABELS[status] ?? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ")}
    </span>
  );
}
