import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DemoBanner } from "@/components/portal/DemoBanner";
import { LiveUpdates } from "@/components/portal/LiveUpdates";
import { PortalFooter } from "@/components/portal/PortalFooter";
import { PortalHeader } from "@/components/portal/PortalHeader";
import { PortalAdminBar } from "@/components/portal/PortalAdminBar";
import { getPortalAdminRole } from "@/lib/auth";
import { getLiveAnnouncements, getPortalStatus, getPublicCollege } from "@/lib/data";
import { platformUrl, portalPath, portalUrl } from "@/lib/tenant";

type Params = Promise<{ college: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { college: slug } = await params;
  const college = await getPublicCollege(slug);
  if (!college) return { title: "Portal not available", robots: { index: false } };
  const short = college.short_name || college.name;
  return {
    title: { default: `${short} - College Announcements`, template: `%s | ${short} | NotifyHub` },
    description: `Latest announcements, events and notices from ${college.name}.`,
    alternates: { canonical: portalUrl(slug) },
    icons: college.logo_url ? { icon: college.logo_url } : undefined,
    openGraph: {
      title: `${short} - College Announcements`,
      description: `Latest announcements, events and notices from ${college.name}.`,
      url: portalUrl(slug),
      siteName: "NotifyHub",
      images: college.cover_image_url ? [{ url: college.cover_image_url }] : undefined,
      type: "website",
    },
    robots: college.is_demo ? { index: false } : undefined,
  };
}

export default async function PortalLayout({ children, params }: { children: React.ReactNode; params: Params }) {
  const { college: slug } = await params;
  const college = await getPublicCollege(slug);

  if (!college) {
    const status = await getPortalStatus(slug);
    if (!status || status === "onboarding" || status === "rejected") notFound();
    return <PortalUnavailable status={status} />;
  }

  const [[latest], adminRole] = await Promise.all([getLiveAnnouncements(college.id, { limit: 1 }), getPortalAdminRole(college.id)]);
  const p = (path: string) => portalPath(slug, path);
  const nav = [
    { href: p("/"), label: "Home" },
    { href: p("/announcements"), label: "Announcements" },
    { href: p("/events"), label: "Events" },
    { href: p("/departments"), label: "Departments" },
    { href: p("/about"), label: "About" },
  ];

  return (
    <div className="flex min-h-dvh flex-col" style={{ ["--tenant" as string]: college.brand_color }}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>
      {adminRole ? <PortalAdminBar role={adminRole} adminHref={p} /> : null}
      {college.is_demo ? <DemoBanner /> : null}
      <PortalHeader
        slug={slug}
        name={college.name}
        shortName={college.short_name}
        logoUrl={college.logo_url}
        nav={nav}
        homeHref={p("/")}
        latestNoticeAt={latest?.published_at ?? null}
      />
      <main id="main" className="flex-1">
        {children}
      </main>
      <PortalFooter college={college} aboutHref={p("/about")} />
      <LiveUpdates collegeId={college.id} noticeBase={p("/announcements")} />
    </div>
  );
}

function PortalUnavailable({ status }: { status: string }) {
  const pending = status === "pending_review";
  return (
    <main className="page-width flex min-h-dvh max-w-xl flex-col justify-center py-16">
      <h1 className="hd-1">{pending ? "This portal is not published yet" : "This portal is temporarily unavailable"}</h1>
      <p className="lede mt-3">
        {pending
          ? "The college has set up its NotifyHub portal and it is waiting for verification. Please check back soon."
          : "The college's portal has been paused. Notices will be back once it is restored. For urgent information, contact the college directly."}
      </p>
      <p className="mt-6">
        <a className="link" href={platformUrl("/")}>About NotifyHub</a>
      </p>
    </main>
  );
}
