import Link from "next/link";
import { Menu } from "lucide-react";
import { Wordmark } from "@/components/ui/Logo";

const NAV = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/#for-colleges", label: "For colleges" },
  { href: "/#for-students", label: "For students" },
  { href: "/verification", label: "Verification" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-surface">
      <div className="page-width flex h-16 items-center justify-between gap-4">
        <Wordmark />
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-sm px-3 py-2 text-[0.9375rem] font-bold text-ink-2 hover:text-ink">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="btn-ghost btn-sm hidden sm:inline-flex">
            Sign in
          </Link>
          <Link href="/connect-college" className="btn-primary btn-sm">
            Connect your college
          </Link>
          <details className="relative md:hidden">
            <summary className="btn-ghost btn-sm list-none px-2 [&::-webkit-details-marker]:hidden" aria-label="Menu">
              <Menu size={20} aria-hidden="true" />
            </summary>
            <div className="absolute right-0 z-20 mt-2 w-56 rounded-md border border-line bg-surface p-1.5 shadow-float">
              {[...NAV, { href: "/login", label: "Sign in" }].map((n) => (
                <Link key={n.href} href={n.href} className="block rounded-sm px-3 py-2 text-[0.9375rem] font-bold text-ink hover:bg-sunken">
                  {n.label}
                </Link>
              ))}
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
