import { StaffFlash } from "@/components/admin/CollegeTable";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { saveSettings } from "@/lib/actions/super";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "System settings" };

export default async function Settings({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("platform_settings").select("key, value");
  const get = (k: string) => (data ?? []).find((r) => r.key === k)?.value;
  return (
    <div className="max-w-2xl">
      <h1 className="hd-1 mb-5">System settings</h1>
      <StaffFlash saved={sp.saved} />
      <form action={saveSettings} className="panel space-y-5 p-5">
        <label className="flex items-start gap-3">
          <input type="checkbox" name="accept_new_colleges" defaultChecked={get("accept_new_colleges") !== false} className="mt-1 accent-brand" />
          <span>
            <span className="block font-bold">Accept new college registrations</span>
            <span className="block text-[0.875rem] text-ink-2">When off, the Connect your college form refuses new submissions.</span>
          </span>
        </label>
        <label className="flex items-start gap-3">
          <input type="checkbox" name="require_manual_approval" defaultChecked={get("require_manual_approval") === true} className="mt-1 accent-brand" />
          <span>
            <span className="block font-bold">Review every college before it goes live</span>
            <span className="block text-[0.875rem] text-ink-2">Even colleges verified by email, DNS or website tag wait for staff approval.</span>
          </span>
        </label>
        <p className="text-[0.875rem] text-ink-3">Upload limit: {String(get("max_upload_mb") ?? 10)} MB per file (set on the storage bucket).</p>
        <SubmitButton>Save settings</SubmitButton>
      </form>
    </div>
  );
}
