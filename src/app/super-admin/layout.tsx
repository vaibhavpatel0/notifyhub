import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/AdminNav";
import { Wordmark } from "@/components/ui/Logo";
import { signOut } from "@/lib/actions/auth";
import { requirePlatformAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: { default: "NotifyHub staff", template: "%s | NotifyHub staff" }, robots: { index: false } };

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePlatformAdmin();
  const nav = [
    { href: "/super-admin", label: "Overview" },
    { href: "/super-admin/colleges", label: "Colleges" },
    { href: "/super-admin/verifications", label: "Pending verifications" },
    { href: "/super-admin/colleges?status=active", label: "Verified colleges" },
    { href: "/super-admin/colleges?status=suspended", label: "Suspended colleges" },
    { href: "/super-admin/activity", label: "Activity" },
    { href: "/super-admin/settings", label: "System settings" },
  ];
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="border-b border-line bg-surface lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:border-r lg:border-b-0">
        <div className="px-4 py-4">
          <Wordmark href="/super-admin" />
          <p className="mt-1 text-[0.8125rem] font-bold text-ink-3">Platform staff</p>
        </div>
        <nav aria-label="Staff" className="px-2 pb-2 lg:flex-1">
          <AdminNav items={nav} root="/super-admin" />
        </nav>
        <form action={signOut} className="hidden border-t border-line p-2 lg:block">
          <p className="truncate px-3 pb-1 text-[0.8125rem] text-ink-3">{user.email}</p>
          <button type="submit" className="w-full rounded-md px-3 py-2 text-left text-[0.9375rem] font-bold text-ink-2 hover:bg-sunken">Sign out</button>
        </form>
      </aside>
      <main className="mx-auto w-full max-w-[1160px] min-w-0 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
