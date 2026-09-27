import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicCollege } from "@/lib/data";

export const metadata: Metadata = { title: "About" };

const SOCIAL_LABELS: Record<string, string> = { website: "Website", facebook: "Facebook", instagram: "Instagram", x: "X (Twitter)", linkedin: "LinkedIn", youtube: "YouTube" };

export default async function AboutPage({ params }: { params: Promise<{ college: string }> }) {
  const { college: slug } = await params;
  const college = await getPublicCollege(slug);
  if (!college) notFound();
  const social = Object.entries(college.social_links ?? {}).filter(([, v]) => typeof v === "string" && /^https?:\/\//.test(v));

  return (
    <div className="page-width grid gap-10 py-8 sm:py-10 lg:grid-cols-[1fr_340px]">
      <article>
        <h1 className="hd-1">About {college.name}</h1>
        {college.description ? <p className="lede mt-3 max-w-[62ch]">{college.description}</p> : null}
        {college.about ? (
          <div className="prose-notice mt-6 max-w-[68ch] text-[1.0625rem] leading-relaxed whitespace-pre-line text-ink-2">{college.about}</div>
        ) : (
          <p className="mt-6 text-ink-3">The college has not added an About section yet.</p>
        )}
      </article>
      <aside>
        <h2 className="hd-2">Contact</h2>
        <dl className="panel mt-3 divide-y divide-line text-[0.9375rem]">
          {college.address ? <Row label="Address">{college.address}</Row> : null}
          {college.phone ? <Row label="Phone"><a className="link" href={`tel:${college.phone.replace(/\s/g, "")}`}>{college.phone}</a></Row> : null}
          {college.contact_email ? <Row label="Email"><a className="link break-all" href={`mailto:${college.contact_email}`}>{college.contact_email}</a></Row> : null}
          <Row label="Official website"><a className="link break-all" href={college.official_website} rel="noopener">{college.official_website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a></Row>
        </dl>
        {social.length ? (
          <>
            <h2 className="hd-3 mt-6">Elsewhere</h2>
            <ul className="mt-2 space-y-1.5">
              {social.map(([k, v]) => (
                <li key={k}><a className="link" href={v as string} rel="noopener noreferrer" target="_blank">{SOCIAL_LABELS[k] ?? k}</a></li>
              ))}
            </ul>
          </>
        ) : null}
        {college.verified && !college.is_demo ? (
          <p className="mt-6 rounded-md border border-ok/30 bg-ok-tint px-3 py-2 text-[0.875rem] text-ok">
            <strong>Verified college.</strong> NotifyHub confirmed that this portal is run by the college.
          </p>
        ) : null}
      </aside>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3">
      <dt className="text-[0.8125rem] font-bold text-ink-3">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
