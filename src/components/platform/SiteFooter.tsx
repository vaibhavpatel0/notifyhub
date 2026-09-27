import Link from "next/link";
import { LogoMark } from "@/components/ui/Logo";
import { SUPPORT_EMAIL } from "@/lib/env";
import { portalUrl } from "@/lib/tenant";

export function SiteFooter() {
  const cols = [
    {
      title: "Product",
      links: [
        { href: "/how-it-works", label: "How it works" },
        { href: "/connect-college", label: "Connect your college" },
        { href: portalUrl("vits"), label: "Demo portal (sample data)" },
        { href: "/login", label: "Admin sign-in" },
      ],
    },
    {
      title: "Trust",
      links: [
        { href: "/verification", label: "College verification" },
        { href: "/privacy", label: "Privacy policy" },
        { href: "/terms", label: "Terms of service" },
        { href: "/cookies", label: "Cookie policy" },
      ],
    },
    {
      title: "Contact",
      links: [
        { href: "/contact", label: "Contact us" },
        { href: `mailto:${SUPPORT_EMAIL}`, label: SUPPORT_EMAIL },
      ],
    },
  ];
  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="page-width grid gap-10 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-xs">
          <div className="flex items-center gap-2.5">
            <LogoMark size={24} />
            <span className="font-extrabold">NotifyHub</span>
          </div>
          <p className="mt-3 text-[0.9375rem] text-ink-2">
            Announcement and events portals for colleges. One platform, a separate portal and admin space for each college.
          </p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h2 className="text-[0.875rem] font-extrabold text-ink">{c.title}</h2>
            <ul className="mt-3 space-y-2">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-[0.9375rem] text-ink-2 hover:text-ink hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <p className="page-width py-4 text-[0.8125rem] text-ink-3">© {new Date().getFullYear()} NotifyHub</p>
      </div>
    </footer>
  );
}
