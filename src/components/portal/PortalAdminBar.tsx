import Link from "next/link";
import { ImageIcon, LayoutDashboard, PenSquare } from "lucide-react";

/**
 * Shown on the public portal only to this college's own signed-in admins, so they
 * can jump from what students see to changing it. Students never see it.
 */
export function PortalAdminBar({ role, adminHref }: { role: "college_admin" | "department_admin"; adminHref: (path: string) => string }) {
  const link = "inline-flex items-center gap-1.5 rounded-sm px-2 py-1 font-bold hover:bg-white/10 hover:underline";
  return (
    <div className="bg-ink text-[0.8125rem] text-white">
      <div className="page-width flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-1.5">
        <p className="text-white/80">You are viewing your portal as {role === "college_admin" ? "a college admin" : "a department admin"}. Students do not see this bar.</p>
        <nav aria-label="Admin shortcuts" className="-mx-2 flex flex-wrap items-center">
          {role === "college_admin" ? (
            <Link href={adminHref("/admin/profile#images")} className={link}>
              <ImageIcon size={14} aria-hidden="true" /> Change logo and cover photo
            </Link>
          ) : null}
          <Link href={adminHref("/admin/announcements/new")} className={link}>
            <PenSquare size={14} aria-hidden="true" /> Post a notice
          </Link>
          <Link href={adminHref("/admin")} className={link}>
            <LayoutDashboard size={14} aria-hidden="true" /> Dashboard
          </Link>
        </nav>
      </div>
    </div>
  );
}
