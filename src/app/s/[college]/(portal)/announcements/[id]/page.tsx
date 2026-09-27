/* eslint-disable @next/next/no-img-element -- notice images are user uploads served from storage */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { ShareButton, ViewRecorder } from "@/components/portal/ClientBits";
import { CategoryTag, DeptTag, UrgentBadge } from "@/components/ui/Badges";
import { getPublicAnnouncement, getPublicCollege } from "@/lib/data";
import { formatDateLong, formatDateTime, refLabel, requestTime } from "@/lib/format";
import { portalPath } from "@/lib/tenant";

type Params = Promise<{ college: string; id: string }>;
const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { college: slug, id } = await params;
  const college = await getPublicCollege(slug);
  if (!college || !isUuid(id)) return {};
  const n = await getPublicAnnouncement(college.id, id);
  if (!n) return { title: "Notice not found" };
  return { title: n.title, description: n.description.slice(0, 160), openGraph: { title: n.title, description: n.description.slice(0, 160) } };
}

export default async function AnnouncementDetail({ params }: { params: Params }) {
  const { college: slug, id } = await params;
  const college = await getPublicCollege(slug);
  if (!college || !isUuid(id)) notFound();
  const n = await getPublicAnnouncement(college.id, id);
  if (!n) notFound();
  const p = (path: string) => portalPath(slug, path);
  const tz = college.timezone;
  const ref = refLabel(n.ref_no, n.ref_year);
  const expired = n.expires_at && new Date(n.expires_at).getTime() < requestTime();

  return (
    <div className="page-width py-8 sm:py-10">
      <ViewRecorder id={n.id} />
      <nav aria-label="Breadcrumb" className="meta">
        <Link href={p("/announcements")} className="font-bold hover:underline">Announcements</Link>
        {n.department ? (
          <>
            {" / "}
            <Link href={p(`/departments/${n.department.slug}`)} className="font-bold hover:underline">{n.department.code}</Link>
          </>
        ) : null}
      </nav>

      <article className="mt-4 grid gap-8 lg:grid-cols-[1fr_300px]">
        <div className={`panel min-w-0 p-5 sm:p-8 ${n.is_urgent ? "border-urgent/50" : ""}`}>
          <div className="flex flex-wrap items-center gap-1.5">
            {n.is_urgent ? <UrgentBadge /> : null}
            <CategoryTag value={n.category} />
            {n.department ? <DeptTag code={n.department.code} name={n.department.name} /> : null}
          </div>
          <h1 className="hd-1 mt-3">{n.title}</h1>
          <p className="meta mt-2">
            {ref ? <span className="font-bold text-ink-2">{ref}. </span> : null}
            Published {formatDateLong(n.published_at, tz)}
            {n.department ? ` by ${n.department.name}` : ""}
          </p>
          {n.image_url ? <img src={n.image_url} alt="" className="mt-6 w-full rounded-md border border-line" loading="lazy" /> : null}
          <div className="prose-notice mt-6 max-w-[68ch] text-[1.0625rem] leading-relaxed whitespace-pre-line">{n.description}</div>
          {n.attachment_url ? (
            <a href={n.attachment_url} className="btn-secondary mt-8" target="_blank" rel="noopener" download>
              <Download size={16} aria-hidden="true" />
              Download {n.attachment_name || "attachment"}
            </a>
          ) : null}
        </div>
        <aside className="space-y-4 lg:pt-1">
          <dl className="panel divide-y divide-line text-[0.9375rem]">
            <Meta label="Posted">{formatDateTime(n.published_at, tz)}</Meta>
            {n.expires_at ? <Meta label={expired ? "Expired" : "Valid until"}>{formatDateTime(n.expires_at, tz)}</Meta> : null}
            <Meta label="For">{n.department ? n.department.name : "Whole college"}</Meta>
            {ref ? <Meta label="Reference">{ref}</Meta> : null}
          </dl>
          <ShareButton title={n.title} />
        </aside>
      </article>
    </div>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3">
      <dt className="text-[0.8125rem] font-bold text-ink-3">{label}</dt>
      <dd className="mt-0.5 font-bold">{children}</dd>
    </div>
  );
}
