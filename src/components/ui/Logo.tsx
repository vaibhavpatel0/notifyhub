import Link from "next/link";

/** NotifyHub mark: a notice sheet with a live indicator. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true" focusable="false">
      <rect x="0" y="0" width="28" height="28" rx="5" fill="#12233a" />
      <rect x="6" y="8" width="13" height="2.4" rx="1.2" fill="#fff" />
      <rect x="6" y="13" width="16" height="2.4" rx="1.2" fill="#fff" opacity="0.8" />
      <rect x="6" y="18" width="10" height="2.4" rx="1.2" fill="#fff" opacity="0.6" />
      <circle cx="22" cy="8.2" r="2.6" fill="#e5484d" />
    </svg>
  );
}

export function Wordmark({ href = "/", tone = "dark" }: { href?: string; tone?: "dark" | "light" }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 rounded-sm" aria-label="NotifyHub home">
      <LogoMark />
      <span className={`text-[1.1875rem] font-extrabold tracking-[-0.02em] ${tone === "light" ? "text-white" : "text-ink"}`}>
        NotifyHub
      </span>
    </Link>
  );
}
