"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminNav({ items, root }: { items: { href: string; label: string }[]; root: string }) {
  const pathname = usePathname();
  const active = (href: string) => (href === root ? pathname === root : pathname.startsWith(href));
  return (
    <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {items.map((i) => (
        <li key={i.href}>
          <Link
            href={i.href}
            aria-current={active(i.href) ? "page" : undefined}
            className="block rounded-md px-3 py-2 text-[0.9375rem] font-bold whitespace-nowrap text-ink-2 hover:bg-sunken hover:text-ink aria-[current=page]:bg-brand-tint aria-[current=page]:text-brand"
          >
            {i.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
