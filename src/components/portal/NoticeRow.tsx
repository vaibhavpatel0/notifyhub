import Link from "next/link";
import { Paperclip } from "lucide-react";
import { CategoryTag, DeptTag, NewBadge, UrgentBadge } from "@/components/ui/Badges";
import { formatDate, isNew, refLabel, relativeTime } from "@/lib/format";

export interface NoticeRowData {
  id: string;
  title: string;
  description: string;
  category: string;
  is_urgent: boolean;
  is_pinned?: boolean;
  published_at: string;
  expires_at: string | null;
  ref_no: number | null;
  ref_year: number | null;
  attachment_url: string | null;
  department?: { code: string; name: string } | null;
}

/** A single notice in a list: what it is, who it is for, when it was posted. */
export function NoticeRow({ n, href, tz, showDept = true, now }: { n: NoticeRowData; href: string; tz: string; showDept?: boolean; now: number }) {
  const ref = refLabel(n.ref_no, n.ref_year);
  const excerpt = n.description.replace(/\s+/g, " ").trim();
  return (
    <article className={`relative p-4 sm:px-5 ${n.is_urgent ? "bg-urgent-tint/60" : ""}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        {n.is_urgent ? <UrgentBadge /> : null}
        <CategoryTag value={n.category} />
        {showDept && n.department ? <DeptTag code={n.department.code} name={n.department.name} /> : null}
        {isNew(n.published_at, 48, now) ? <NewBadge /> : null}
      </div>
      <h3 className="mt-2 text-[1.0625rem] leading-snug font-bold">
        <Link href={href} className="after:absolute after:inset-0 hover:underline focus-visible:outline-none">
          {n.title}
        </Link>
      </h3>
      {excerpt ? <p className="mt-1 line-clamp-2 text-[0.9375rem] text-ink-2">{excerpt}</p> : null}
      <p className="meta mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <time dateTime={n.published_at} title={formatDate(n.published_at, tz)}>
          {relativeTime(n.published_at, now)}
        </time>
        {n.expires_at ? <span>Until {formatDate(n.expires_at, tz)}</span> : null}
        {ref ? <span>{ref}</span> : null}
        {n.attachment_url ? (
          <span className="inline-flex items-center gap-1">
            <Paperclip size={12} aria-hidden="true" /> Attachment
          </span>
        ) : null}
      </p>
    </article>
  );
}
