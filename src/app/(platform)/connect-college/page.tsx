import type { Metadata } from "next";
import { loadOnboardingState } from "./actions";
import { Wizard } from "./Wizard";

export const metadata: Metadata = {
  title: "Connect your college",
  description: "Connect your college to NotifyHub: we read your public website, you verify ownership, and your portal gets its own address.",
};

export default async function ConnectCollegePage({ searchParams }: { searchParams: Promise<{ slug?: string }> }) {
  const [{ slug }, initial] = await Promise.all([searchParams, loadOnboardingState()]);
  return (
    <div className="page-width py-8 sm:py-12">
      <div className="max-w-2xl">
        <h1 className="hd-1">Connect your college</h1>
        <p className="lede mt-2">
          Give us your official website. We read its public pages to fill in the details, you confirm that you represent the college, and
          your portal gets its own address. It takes about five minutes.
        </p>
      </div>
      <Wizard initial={initial} preferredSlug={slug?.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40) || null} />
    </div>
  );
}
