import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { AdminNav } from "@/components/admin/AdminNav";
import { NotificationBell } from "@/components/admin/NotificationBell";
import { CollegeMark } from "@/components/portal/CollegeMark";
import { LogoMark } from "@/components/ui/Logo";
import { signOut } from "@/lib/actions/auth";
import { requireCollegeMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { portalPath } from "@/lib/tenant";
import type { NotificationRow } from "@/lib/types";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | Admin | NotifyHub" }, robots: { index: false } };

export default async function AdminLayout({ children, params }: { children: React.ReactNode; params: Promise<{ college: string }> }) {
  const { college: slug } = await params;
  const ctx = await requireCollegeMember(slug);
  const p = (path: string) => portalPath(slug, path);

  const supabase = await createClient();
  const { data: notes } = await supabase
    .from("notifications")
    .select("id, college_id, type, title, message, link, is_read, created_at")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(20);

  const nav = [
    { href: p("/admin"), label: "Dashboard" },
    { href: p("/admin/announcements"), label: "Announcements" },
    { href: p("/admin/events"), label: "Events" },
    ...(ctx.isCollegeAdmin
      ? [
          { href: p("/admin/departments"), label: "Departments" },
          { href: p("/admin/admins"), label: "Team" },
          { href: p("/admin/profile"), label: "College profile" },
          { href: p("/admin/profile#images"), label: "Logo & photos" },
        ]
      : []),
    { href: p("/admin/analytics"), label: "Analytics" },
    { href: p("/admin/settings"), label: "Settings" },
  ];

  const roleLabel = ctx.isCollegeAdmin ? "College admin" : `Department admin, ${ctx.member.department?.code ?? ""}`;
  const status = ctx.college.status;

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]" style={{ ["--tenant" as string]: ctx.college.brand_color }}>
      <aside className="border-b border-line bg-surface lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:border-r lg:border-b-0">
        <div className="flex items-center gap-3 px-4 py-4">
          <CollegeMark name={ctx.college.name} shortName={ctx.college.short_name} logoUrl={ctx.college.logo_url} size={36} />
          <div className="min-w-0">
            <p className="truncate font-extrabold leading-tight">{ctx.college.short_name || ctx.college.name}</p>
            <p className="truncate text-[0.8125rem] text-ink-3">{roleLabel}</p>
          </div>
        </div>
        <nav aria-label="Admin" className="px-2 pb-2 lg:flex-1 lg:overflow-y-auto">
          <AdminNav items={nav} root={p("/admin")} />
        </nav>
        <div className="hidden space-y-1 border-t border-line p-2 lg:block">
          {status === "active" ? (
            <a href={p("/")} target="_blank" rel="noopener" className="flex items-center gap-2 rounded-md px-3 py-2 text-[0.9375rem] font-bold text-ink-2 hover:bg-sunken hover:text-ink">
              View public portal <ExternalLink size={14} aria-hidden="true" />
            </a>
          ) : null}
          <form action={signOut}>
            <input type="hidden" name="college" value={slug} />
            <button type="submit" className="w-full rounded-md px-3 py-2 text-left text-[0.9375rem] font-bold text-ink-2 hover:bg-sunken hover:text-ink">Sign out</button>
          </form>
          <p className="flex items-center gap-2 px-3 pt-2 text-[0.75rem] text-ink-3"><LogoMark size={14} /> NotifyHub</p>
        </div>
      </aside>

      <div className="min-w-0">
        <div className="flex items-center justify-end gap-2 border-b border-line bg-surface px-4 py-2 sm:px-6">
          <span className="mr-auto truncate text-[0.875rem] text-ink-3">{ctx.email}</span>
          <NotificationBell userId={ctx.userId} initial={(notes ?? []) as NotificationRow[]} linkBase={portalPath(slug, "")} />
          <form action={signOut} className="lg:hidden">
            <input type="hidden" name="college" value={slug} />
            <button type="submit" className="btn-ghost btn-sm">Sign out</button>
          </form>
        </div>
        {status !== "active" ? (
          <div className={`border-b px-4 py-3 sm:px-6 ${status === "suspended" ? "border-urgent/30 bg-urgent-tint" : "border-new/30 bg-new-tint"}`}>
            <p className="text-[0.9375rem]">
              <strong>
                {status === "pending_review" ? "Your portal is waiting for NotifyHub review." : status === "suspended" ? "Your portal is suspended." : "Your portal is not public."}
              </strong>{" "}
              {status === "pending_review"
                ? "You can prepare departments, notices and events now. Students will see them once the portal is approved."
                : ctx.college.status_reason ?? "Contact NotifyHub support for details."}
            </p>
          </div>
        ) : null}
        <main className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
