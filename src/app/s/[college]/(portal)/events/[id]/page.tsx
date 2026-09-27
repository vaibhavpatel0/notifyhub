/* eslint-disable @next/next/no-img-element -- event images are user uploads served from storage */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarPlus, Download, ExternalLink } from "lucide-react";
import { ShareButton } from "@/components/portal/ClientBits";
import { Countdown } from "@/components/portal/Countdown";
import { DeptTag } from "@/components/ui/Badges";
import { getPublicCollege, getPublicEvent } from "@/lib/data";
import { formatDateLong, formatTime } from "@/lib/format";
import { portalPath } from "@/lib/tenant";

type Params = Promise<{ college: string; id: string }>;
const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { college: slug, id } = await params;
  const college = await getPublicCollege(slug);
  if (!college || !isUuid(id)) return {};
  const e = await getPublicEvent(college.id, id);
  return e ? { title: e.title, description: e.description.slice(0, 160) } : { title: "Event not found" };
}

export default async function EventDetail({ params }: { params: Params }) {
  const { college: slug, id } = await params;
  const college = await getPublicCollege(slug);
  if (!college || !isUuid(id)) notFound();
  const e = await getPublicEvent(college.id, id);
  if (!e) notFound();
  const p = (path: string) => portalPath(slug, path);
  const tz = college.timezone;

  return (
    <div className="page-width py-8 sm:py-10">
      <nav aria-label="Breadcrumb" className="meta">
        <Link href={p("/events")} className="font-bold hover:underline">Events</Link>
      </nav>
      <article className="mt-4 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="panel min-w-0 overflow-hidden">
          {e.image_url ? <img src={e.image_url} alt="" className="aspect-[2/1] w-full border-b border-line object-cover" /> : null}
          <div className="p-5 sm:p-8">
            {e.department ? <DeptTag code={e.department.code} name={e.department.name} /> : null}
            <h1 className="hd-1 mt-2">{e.title}</h1>
            {e.organizer ? <p className="mt-1 text-ink-2">Organised by {e.organizer}</p> : null}
            {e.countdown_enabled ? (
              <div className="mt-6">
                <Countdown startsAt={e.starts_at} endsAt={e.ends_at} variant="large" />
              </div>
            ) : null}
            <div className="prose-notice mt-6 max-w-[68ch] text-[1.0625rem] leading-relaxed whitespace-pre-line">{e.description}</div>
          </div>
        </div>
        <aside className="space-y-4">
          <dl className="panel divide-y divide-line text-[0.9375rem]">
            <div className="px-4 py-3">
              <dt className="text-[0.8125rem] font-bold text-ink-3">Date</dt>
              <dd className="mt-0.5 font-bold">{formatDateLong(e.starts_at, tz)}</dd>
            </div>
            <div className="px-4 py-3">
              <dt className="text-[0.8125rem] font-bold text-ink-3">Time</dt>
              <dd className="mt-0.5 font-bold">
                {formatTime(e.starts_at, tz)}
                {e.ends_at ? ` to ${formatTime(e.ends_at, tz)}` : ""}
                {e.ends_at && formatDateLong(e.ends_at, tz) !== formatDateLong(e.starts_at, tz) ? ` on ${formatDateLong(e.ends_at, tz)}` : ""}
              </dd>
            </div>
            {e.venue ? (
              <div className="px-4 py-3">
                <dt className="text-[0.8125rem] font-bold text-ink-3">Venue</dt>
                <dd className="mt-0.5 font-bold">{e.venue}</dd>
              </div>
            ) : null}
            <div className="px-4 py-3">
              <dt className="text-[0.8125rem] font-bold text-ink-3">Open to</dt>
              <dd className="mt-0.5 font-bold">{e.department ? e.department.name : "Whole college"}</dd>
            </div>
          </dl>
          <div className="flex flex-col gap-2">
            {e.registration_url ? (
              <a href={e.registration_url} className="btn-tenant" target="_blank" rel="noopener noreferrer">
                Register <ExternalLink size={15} aria-hidden="true" />
              </a>
            ) : null}
            <a href={p(`/events/${e.id}/calendar.ics`)} className="btn-secondary">
              <CalendarPlus size={16} aria-hidden="true" /> Add to calendar
            </a>
            {e.attachment_url ? (
              <a href={e.attachment_url} className="btn-secondary" target="_blank" rel="noopener" download>
                <Download size={16} aria-hidden="true" /> {e.attachment_name || "Download attachment"}
              </a>
            ) : null}
            <ShareButton title={e.title} />
          </div>
        </aside>
      </article>
    </div>
  );
}
