"use client";

import { useState } from "react";
import { formatYears, ordinal } from "@/lib/format";
import type { DepartmentRef } from "@/lib/types";

/**
 * "Which years is this for?" on the notice and event forms.
 * Nothing ticked means every year. The number of year boxes follows the chosen
 * department's course length, or the longest course in the college for
 * college-wide posts.
 */
export function YearPicker({
  departments,
  scope,
  departmentId,
  lockedDepartment,
  initial,
}: {
  departments: DepartmentRef[];
  scope: "college" | "department";
  departmentId: string;
  lockedDepartment: DepartmentRef | null;
  initial?: number[];
}) {
  const [picked, setPicked] = useState<number[]>(initial ?? []);
  const dept = lockedDepartment ?? (scope === "department" ? departments.find((d) => d.id === departmentId) : undefined);
  const max = dept?.years_count ?? Math.max(4, ...departments.map((d) => d.years_count ?? 4));
  const years = Array.from({ length: max }, (_, i) => i + 1);
  // Years beyond the chosen course are dropped rather than submitted.
  const selected = picked.filter((y) => y <= max);
  const all = selected.length === 0;

  const toggle = (y: number) => setPicked((p) => (p.includes(y) ? p.filter((x) => x !== y) : [...p, y].sort((a, b) => a - b)));

  return (
    <div role="group" aria-labelledby="years-label">
      <span id="years-label" className="field-label">Which years?</span>
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          aria-pressed={all}
          onClick={() => setPicked([])}
          className={`rounded-md border px-2 py-1.5 text-[0.875rem] font-bold ${all ? "border-brand bg-brand-tint text-brand-strong" : "border-line text-ink-2 hover:border-line-strong"}`}
        >
          All years
        </button>
        {years.map((y) => (
          <label
            key={y}
            className="cursor-pointer rounded-md border border-line px-2 py-1.5 text-[0.875rem] font-bold text-ink-2 hover:border-line-strong has-[:checked]:border-brand has-[:checked]:bg-brand-tint has-[:checked]:text-brand-strong has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand"
          >
            <input type="checkbox" name="years" value={y} checked={selected.includes(y)} onChange={() => toggle(y)} className="sr-only" />
            {ordinal(y)}
          </label>
        ))}
      </div>
      <span className="field-hint">
        {all ? "Shown to every year." : `For ${formatYears(selected)} students. It is hidden when a student filters by another year.`}
      </span>
    </div>
  );
}
