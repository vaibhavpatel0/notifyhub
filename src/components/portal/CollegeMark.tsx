/* eslint-disable @next/next/no-img-element -- college logos are user uploads served from storage */
import { initials } from "@/lib/format";

export function CollegeMark({ name, shortName, logoUrl, size = 40, onBrand = false }: { name: string; shortName?: string | null; logoUrl: string | null; size?: number; onBrand?: boolean }) {
  const label = shortName && shortName.length <= 5 ? shortName.toUpperCase() : initials(name).slice(0, 3);
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-md bg-white object-contain p-1"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-sm font-extrabold tracking-tight ${onBrand ? "bg-white/15 text-white" : "text-white"}`}
      style={{ width: size, height: size, fontSize: size * (label.length > 3 ? 0.28 : 0.34), background: onBrand ? undefined : "var(--tenant)" }}
    >
      {label}
    </span>
  );
}
