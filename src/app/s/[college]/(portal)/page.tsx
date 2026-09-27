/* eslint-disable @next/next/no-img-element -- cover photos are user uploads served from storage */
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BellRing, Search } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { EventRow } from "@/components/portal/EventRow";
import { NoticeRow } from "@/components/portal/NoticeRow";
import { NoticeBoard, type BoardItem } from "@/components/portal/NoticeBoard";
import { getLiveAnnouncements, getPublicCollege, getPublicDepartments, getPublicEvents } from "@/lib/data";
import { dateParts, formatDate, formatTime, refLabel, relativeTime, requestTime } from "@/lib/format";
import { categoryLabel } from "@/lib/constants";
import type { Announcement, CampusEvent } from "@/lib/types";
import { SUPABASE_URL } from "@/lib/env";
import { portalPath } from "@/lib/tenant";

export default async function PortalHome({ params }: { params: Promise<{ college: string }> }) {
  const { college: slug } = await params;
  const college = await getPublicCollege(slug);
  if (!college) notFound();
  const p = (path: string) => portalPath(slug, path);
  const s = college.homepage_sections;
  const tz = college.timezone;

  const [urgent, latest, pinned, events, departments, boardNotices, boardEvents] = await Promise.all([
    s.urgent ? getLiveAnnouncements(college.id, { scope: "college", urgent: true, limit: 5 }) : [],
    s.announcements ? getLiveAnnouncements(college.id, { scope: "college", urgent: false, limit: 6 }) : [],
    s.important ? getLiveAnnouncements(college.id, { pinned: true, limit: 5 }) : [],
    s.events ? getPublicEvents(college.id, { when: "upcoming", limit: 4 }) : [],
    s.departments ? getPublicDepartments(college.id) : [],
    getLiveAnnouncements(college.id, { limit: 6 }),
    getPublicEvents(college.id, { when: "upcoming", limit: 3 }),
  ]);
  const now = requestTime();
  const board = boardItems(boardNotices, boardEvents, { tz, now, p });

  return (
    <>
      {college.cover_image_url ? (
        // Campus photo as a full-width banner, the way college websites open.
        <section className="relative isolate overflow-hidden border-b border-line bg-ink text-white">
          {/* Resized and converted to AVIF/WebP for each screen, and fetched first: it is the largest thing on the page. */}
          <Image
            src={college.cover_image_url}
            alt=""
            fill
            preload
            sizes="100vw"
            unoptimized={!college.cover_image_url.startsWith(`${SUPABASE_URL}/storage/v1/object/public/`)}
            className="-z-10 object-cover"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/75 via-black/55 to-black/25" aria-hidden="true" />
          <div className="page-width py-10 sm:py-16 lg:py-20">
            {college.logo_url ? (
              <img src={college.logo_url} alt="" width={72} height={72} className="mb-5 size-16 rounded-md bg-white object-contain p-1.5 shadow-sm sm:size-[72px]" />
            ) : null}
            <h1 className="hd-1 max-w-[22ch] text-white">{college.welcome_heading || `Welcome to ${college.name}`}</h1>
            {college.welcome_text ? <p className="mt-3 max-w-[56ch] text-[1.0625rem] leading-relaxed text-white/90">{college.welcome_text}</p> : null}
            <HomeSearch action={p("/announcements")} />
          </div>
        </section>
      ) : (
        <section className="border-b border-line bg-surface">
          <div className="page-width py-8 sm:py-10">
            <h1 className="hd-1 max-w-[22ch]">{college.welcome_heading || `Welcome to ${college.name}`}</h1>
            {college.welcome_text ? <p className="lede mt-3 max-w-[56ch]">{college.welcome_text}</p> : null}
            <HomeSearch action={p("/announcements")} />
          </div>
        </section>
      )}

      <div className="page-width space-y-10 py-8 sm:py-10">
        {urgent.length ? (
          <section aria-labelledby="urgent-heading" className="overflow-hidden rounded-lg border border-urgent/40 bg-surface">
            <h2 id="urgent-heading" className="flex items-center gap-2 bg-urgent px-4 py-2.5 text-[0.9375rem] font-extrabold text-white sm:px-5">
              <BellRing size={16} aria-hidden="true" /> Urgent announcements
            </h2>
            <ul className="divide-y divide-urgent/20">
              {urgent.map((n) => (
                <li key={n.id} className="relative px-4 py-3 sm:px-5">
                  <Link href={p(`/announcements/${n.id}`)} className="font-bold after:absolute after:inset-0 hover:underline">
                    {n.title}
                  </Link>
                  <p className="meta mt-0.5">
                    Posted {formatDate(n.published_at, tz)}
                    {n.expires_at ? `, valid until ${formatDate(n.expires_at, tz)}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {board.length >= 2 ? (
          <section aria-labelledby="board-heading">
            <div className="mb-3 flex items-end justify-between gap-4">
              <div>
                <h2 id="board-heading" className="hd-2">Notice board</h2>
                <p className="meta mt-0.5">Latest notices and upcoming events. Point at or tap a card to open it.</p>
              </div>
              <Link href={p("/announcements")} className="text-[0.9375rem] font-bold whitespace-nowrap hover:underline" style={{ color: "var(--tenant)" }}>
                All notices
              </Link>
            </div>
            <NoticeBoard items={board} label="Notice board" />
          </section>
        ) : null}

        <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
          {s.announcements ? (
            <section aria-labelledby="latest-heading">
              <SectionHead id="latest-heading" title="Latest announcements" href={p("/announcements")} linkLabel="View all" />
              {latest.length ? (
                <div className="panel divide-y divide-line">
                  {latest.map((n) => (
                    <NoticeRow key={n.id} n={n} href={p(`/announcements/${n.id}`)} tz={tz} now={now} />
                  ))}
                </div>
              ) : (
                <EmptyState title="No announcements yet" body="College-wide notices will appear here as soon as they are published." />
              )}
            </section>
          ) : null}

          <div className="space-y-10">
            {s.events ? (
              <section aria-labelledby="events-heading">
                <SectionHead id="events-heading" title="Upcoming events" href={p("/events")} linkLabel="View all" />
                {events.length ? (
                  <div className="panel divide-y divide-line">
                    {events.map((e) => (
                      <EventRow key={e.id} e={e} href={p(`/events/${e.id}`)} tz={tz} compact />
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No upcoming events" />
                )}
              </section>
            ) : null}

            {s.important && pinned.length ? (
              <section aria-labelledby="important-heading">
                <SectionHead id="important-heading" title="Important notices" />
                <ul className="panel divide-y divide-line">
                  {pinned.map((n) => (
                    <li key={n.id} className="relative px-4 py-3">
                      <Link href={p(`/announcements/${n.id}`)} className="font-bold leading-snug after:absolute after:inset-0 hover:underline">
                        {n.title}
                      </Link>
                      <p className="meta mt-0.5">
                        {[refLabel(n.ref_no, n.ref_year), n.department?.code, n.expires_at ? `Until ${formatDate(n.expires_at, tz)}` : null]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </div>

        {s.departments && departments.length ? (
          <section aria-labelledby="departments-heading">
            <SectionHead id="departments-heading" title="Departments" href={p("/departments")} linkLabel="View all" />
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {departments.map((d) => (
                <li key={d.id}>
                  <Link
                    href={p(`/departments/${d.slug}`)}
                    className="flex h-full flex-col rounded-lg border border-line bg-surface p-4 transition-colors hover:border-line-strong"
                  >
                    <span className="text-[1.375rem] font-extrabold tracking-[-0.01em]" style={{ color: "var(--tenant)" }}>
                      {d.code}
                    </span>
                    <span className="mt-1 text-[0.875rem] leading-snug text-ink-2">{d.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {(s.about && college.about) || s.contact ? (
          <section className="grid gap-8 border-t border-line pt-10 md:grid-cols-[1.4fr_1fr]">
            {s.about && college.about ? (
              <div>
                <h2 className="hd-2">About {college.short_name || "the college"}</h2>
                <p className="mt-2 max-w-[68ch] text-ink-2">{college.about.split(/\n\s*\n/)[0]}</p>
                <Link href={p("/about")} className="link mt-3 inline-block">Read more<span className="sr-only"> about {college.name}</span></Link>
              </div>
            ) : <div />}
            {s.contact ? (
              <div>
                <h2 className="hd-2">Contact</h2>
                <dl className="mt-2 space-y-2 text-[0.9375rem]">
                  {college.address ? <ContactLine label="Address">{college.address}</ContactLine> : null}
                  {college.phone ? <ContactLine label="Phone"><a className="link" href={`tel:${college.phone.replace(/\s/g, "")}`}>{college.phone}</a></ContactLine> : null}
                  {college.contact_email ? <ContactLine label="Email"><a className="link break-all" href={`mailto:${college.contact_email}`}>{college.contact_email}</a></ContactLine> : null}
                  <ContactLine label="Website"><a className="link break-all" href={college.official_website} rel="noopener">{college.official_website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a></ContactLine>
                </dl>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </>
  );
}

function SectionHead({ id, title, href, linkLabel }: { id: string; title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4">
      <h2 id={id} className="hd-2">{title}</h2>
      {href ? (
        <Link href={href} className="text-[0.9375rem] font-bold hover:underline" style={{ color: "var(--tenant)" }}>
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}

function ContactLine({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[72px_1fr] gap-2">
      <dt className="font-bold text-ink-3">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function HomeSearch({ action }: { action: string }) {
  return (
    <form action={action} method="get" role="search" className="mt-6 flex max-w-lg gap-2">
      <label className="sr-only" htmlFor="home-search">Search announcements</label>
      <div className="relative flex-1">
        <Search size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" aria-hidden="true" />
        <input id="home-search" name="q" type="search" placeholder="Search announcements..." className="input min-h-11 pl-10" />
      </div>
      <button type="submit" className="btn-tenant min-h-11">Search</button>
    </form>
  );
}

/** Urgent notices first, then new notices and upcoming events alternately; at most six cards. */
function boardItems(
  notices: Announcement[],
  events: CampusEvent[],
  { tz, now, p }: { tz: string; now: number; p: (path: string) => string },
): BoardItem[] {
  const short = (iso: string) => {
    const d = dateParts(iso, tz);
    return `${d.day} ${d.month}`;
  };
  const fromNotice = (n: Announcement): BoardItem => ({
    key: `n-${n.id}`,
    kind: "notice",
    title: n.title,
    href: p(`/announcements/${n.id}`),
    image: n.image_url,
    eyebrow: [categoryLabel(n.category), n.department?.code].filter(Boolean).join(" · "),
    when: `Posted ${relativeTime(n.published_at, now)}`,
    chip: short(n.published_at),
    urgent: n.is_urgent,
  });
  const fromEvent = (e: CampusEvent): BoardItem => {
    const d = dateParts(e.starts_at, tz);
    return {
      key: `e-${e.id}`,
      kind: "event",
      title: e.title,
      href: p(`/events/${e.id}`),
      image: e.image_url,
      eyebrow: ["Event", e.department?.code, e.venue].filter(Boolean).join(" · "),
      when: `${d.weekday} ${d.day} ${d.month}, ${formatTime(e.starts_at, tz)}`,
      chip: short(e.starts_at),
      urgent: false,
    };
  };
  const urgentFirst = notices.filter((n) => n.is_urgent).map(fromNotice);
  const rest = notices.filter((n) => !n.is_urgent).map(fromNotice);
  const evs = events.map(fromEvent);
  const mixed: BoardItem[] = [];
  for (let i = 0; i < Math.max(rest.length, evs.length); i++) {
    if (rest[i]) mixed.push(rest[i]!);
    if (evs[i]) mixed.push(evs[i]!);
  }
  return [...urgentFirst, ...mixed].slice(0, 6);
}
