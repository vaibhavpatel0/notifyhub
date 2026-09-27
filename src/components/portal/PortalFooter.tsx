import Link from "next/link";
import { LogoMark } from "@/components/ui/Logo";
import { platformUrl } from "@/lib/tenant";
import type { College } from "@/lib/types";

export function PortalFooter({ college, aboutHref }: { college: College; aboutHref: string }) {
  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="page-width grid gap-8 py-10 sm:grid-cols-2">
        <div>
          <p className="font-extrabold">{college.name}</p>
          {college.address ? <p className="mt-1 text-[0.9375rem] text-ink-2">{college.address}</p> : null}
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[0.9375rem]">
            {college.phone ? <a className="link" href={`tel:${college.phone.replace(/\s/g, "")}`}>{college.phone}</a> : null}
            {college.contact_email ? <a className="link" href={`mailto:${college.contact_email}`}>{college.contact_email}</a> : null}
            <Link className="link" href={aboutHref}>About and contact</Link>
          </p>
        </div>
        <div className="sm:text-right">
          <a href={platformUrl("/")} className="inline-flex items-center gap-2 text-[0.875rem] font-bold text-ink-2 hover:text-ink">
            <LogoMark size={18} /> Powered by NotifyHub
          </a>
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[0.8125rem] text-ink-3 sm:justify-end">
            <a href={platformUrl("/privacy")} className="hover:underline">Privacy</a>
            <a href={platformUrl("/terms")} className="hover:underline">Terms</a>
            <a href={platformUrl("/cookies")} className="hover:underline">Cookies</a>
            <a href={platformUrl("/contact")} className="hover:underline">Report a problem</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
