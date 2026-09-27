import { platformUrl } from "@/lib/tenant";

export function DemoBanner() {
  return (
    <div className="border-b border-new/30 bg-new-tint">
      <p className="page-width py-2 text-[0.875rem] text-ink">
        <strong>Demo college.</strong> Every notice, event and name on this portal is sample data.{" "}
        <a href={platformUrl("/connect-college")} className="font-bold underline underline-offset-2">Connect your own college</a>
      </p>
    </div>
  );
}
