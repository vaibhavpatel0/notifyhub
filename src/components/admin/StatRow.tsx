export function StatRow({ stats }: { stats: { label: string; value: number | string; tone?: "urgent" }[] }) {
  return (
    <dl className="grid grid-cols-2 overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3 lg:grid-cols-5" style={{ gap: 1 }}>
      {stats.map((s) => (
        <div key={s.label} className="bg-surface px-4 py-4">
          <dt className="text-[0.8125rem] font-bold text-ink-3">{s.label}</dt>
          <dd className={`mt-1 text-[1.75rem] leading-none font-extrabold tabular-nums ${s.tone === "urgent" && Number(s.value) > 0 ? "text-urgent" : ""}`}>
            {typeof s.value === "number" ? s.value.toLocaleString("en-IN") : s.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
