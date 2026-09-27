"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Menu, X } from "lucide-react";
import { CollegeMark } from "./CollegeMark";

export interface NavItem {
  href: string;
  label: string;
}

const LAST_SEEN = (slug: string) => `nh:last-seen:${slug}`;
const noopSubscribe = () => () => {};
function readSeen(slug: string) {
  try {
    return localStorage.getItem(LAST_SEEN(slug));
  } catch {
    return null;
  }
}

export function PortalHeader({
  slug,
  name,
  shortName,
  logoUrl,
  nav,
  homeHref,
  latestNoticeAt,
}: {
  slug: string;
  name: string;
  shortName: string | null;
  logoUrl: string | null;
  nav: NavItem[];
  homeHref: string;
  latestNoticeAt: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    // Close the mobile menu on navigation.
    setLastPath(pathname);
    setOpen(false);
  }

  // "New since your last visit" marker. The time of the last visit lives only in this browser.
  const seen = useSyncExternalStore(noopSubscribe, () => readSeen(slug), () => null);
  const onAnnouncements = Boolean(nav[1]?.href && pathname.startsWith(nav[1].href));
  const unread = !onAnnouncements && Boolean(latestNoticeAt && seen && new Date(latestNoticeAt) > new Date(seen));
  useEffect(() => {
    try {
      if (onAnnouncements || !localStorage.getItem(LAST_SEEN(slug))) localStorage.setItem(LAST_SEEN(slug), new Date().toISOString());
    } catch {
      /* storage unavailable (private mode): no indicator */
    }
  }, [onAnnouncements, slug]);

  const isActive = (href: string) => (href === homeHref ? pathname === homeHref || pathname === `${homeHref}/` : pathname.startsWith(href));

  return (
    <header className="text-white" style={{ background: "var(--tenant)" }}>
      <div className="page-width flex min-h-16 items-center justify-between gap-4 py-2">
        <Link href={homeHref} className="flex min-w-0 items-center gap-3 rounded-sm">
          <CollegeMark name={name} shortName={shortName} logoUrl={logoUrl} size={logoUrl ? 48 : 40} onBrand />
          <span className="min-w-0">
            <span className="block truncate text-[1.0625rem] leading-tight font-extrabold sm:hidden">{shortName || name}</span>
            <span className="hidden truncate text-[1.125rem] leading-tight font-extrabold sm:block">{name}</span>
            <span className="block text-[0.75rem] text-white/75">Notices and events</span>
          </span>
        </Link>
        <nav aria-label="Portal" className="hidden md:block">
          <ul className="flex items-center gap-0.5">
            {nav.map((item, i) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className="relative block rounded-sm px-3 py-2 text-[0.9375rem] font-bold text-white/80 hover:bg-white/10 hover:text-white aria-[current=page]:bg-white/15 aria-[current=page]:text-white"
                >
                  {item.label}
                  {i === 1 && unread ? <UnreadDot /> : null}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <button
          type="button"
          className="relative rounded-sm p-2 hover:bg-white/10 md:hidden"
          aria-expanded={open}
          aria-controls="portal-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          {!open && unread ? <UnreadDot /> : null}
        </button>
      </div>
      {open ? (
        <nav id="portal-menu" aria-label="Portal" className="border-t border-white/15 md:hidden">
          <ul className="page-width py-2">
            {nav.map((item, i) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className="flex items-center justify-between rounded-sm px-2 py-3 text-[1rem] font-bold text-white/85 aria-[current=page]:text-white"
                >
                  {item.label}
                  {i === 1 && unread ? <span className="rounded-xs bg-white px-1.5 text-[0.75rem] font-extrabold" style={{ color: "var(--tenant)" }}>New</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}

function UnreadDot() {
  return (
    <span className="absolute top-1.5 right-1 size-2 rounded-full bg-[#ffd166] ring-2" style={{ ["--tw-ring-color" as string]: "var(--tenant)" }}>
      <span className="sr-only">New notices since your last visit</span>
    </span>
  );
}
