import Link from "next/link";
import { AddressChecker } from "@/components/platform/AddressChecker";
import { CollegeSearch } from "@/components/platform/CollegeSearch";
import { PortalPreview } from "@/components/platform/PortalPreview";
import { ROOT_DOMAIN as ROOT_DOMAIN_LABEL } from "@/lib/env";
import { portalUrl } from "@/lib/tenant";

const STEPS = [
  ["Connect your college", "Enter the official website. NotifyHub reads the public pages and fills in the name, contact details and departments."],
  ["Verify your college", "Confirm ownership with a code sent to an official college email, a DNS record, a website tag, or a manual review."],
  ["Get your address", `Pick a short address such as yourcollege.${ROOT_DOMAIN_LABEL}. It is the only thing students need to remember.`],
  ["Customise the portal", "Add your logo, cover photo, welcome message, departments and contact details."],
  ["Publish notices", "College admins post college-wide notices. Department admins post for their own department only."],
  ["Students read instantly", "New notices appear on open pages without a refresh. No app to install and no account to create."],
] as const;

const FEATURES = [
  ["Real-time announcements", "A published notice appears on every open copy of the portal within seconds, without reloading the page."],
  ["Urgent alerts", "Urgent notices are marked in red and pinned to the top of the home page until they expire."],
  ["Department portals", "Each department gets its own page and its own admins, who cannot edit other departments."],
  ["Events with countdowns", "Events show date, venue, organiser and registration link, with a live countdown to the start."],
  ["Search and filters", "Students search by title, text, category or department and sort by latest, oldest or closing soon."],
  ["Year-wise notices", "Aim a notice or event at 1st, 2nd, 3rd or 4th year, or any mix. Students filter by their own year and still see notices for everyone."],
  ["Circular numbers", "Every notice gets a reference number per year, so staff and students can cite it the way paper circulars are cited."],
  ["Scheduling and expiry", "Notices can go live at a set time and disappear after a deadline, so the board stays current by itself."],
  ["Attachments", "Upload PDFs, Word, Excel or image files up to 10 MB for timetables, forms and circulars."],
  ["Activity history", "Every create, edit and delete is recorded with who made it, for accountability between departments."],
  ["Open around the clock", "The portal works on any phone browser at any hour. Students do not need to be on campus to read the board."],
] as const;

export default function LandingPage() {
  return (
    <>
      <section className="border-b border-line bg-surface">
        <div className="page-width grid items-center gap-12 py-12 sm:py-16 lg:grid-cols-[1.15fr_1fr] lg:py-20">
          <div>
            <h1 className="hd-display max-w-[17ch]">Replace traditional notice boards with real-time digital announcements.</h1>
            <p className="lede mt-5 max-w-[52ch]">
              Connect your college to NotifyHub and create a dedicated digital campus announcement portal. Students open one address on their phone and see every notice, exam schedule and event.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/connect-college" className="btn-primary min-h-12 px-5 text-[1rem]">
                Connect your college
              </Link>
              <a href={portalUrl("vits")} className="btn-secondary min-h-12 px-5 text-[1rem]">
                Explore the demo portal
              </a>
            </div>
            <div className="mt-10 border-t border-line pt-6">
              <CollegeSearch />
            </div>
          </div>
          <PortalPreview />
        </div>
      </section>

      <section id="how-it-works" className="page-width py-14 sm:py-20">
        <div className="max-w-2xl">
          <h2 className="hd-1">How it works</h2>
          <p className="lede mt-2">From website to working portal in one sitting. Nothing becomes public until the college is verified.</p>
        </div>
        <ol className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map(([title, body], i) => (
            <li key={title} className="border-t-2 border-ink pt-4">
              <span className="text-[0.9375rem] font-extrabold text-brand tabular-nums">Step {i + 1}</span>
              <h3 className="hd-3 mt-1">{title}</h3>
              <p className="mt-1.5 text-ink-2">{body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-8">
          <Link href="/how-it-works" className="link">
            Read the full onboarding guide
          </Link>
        </p>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="page-width grid gap-12 py-14 sm:py-20 md:grid-cols-2 md:gap-16">
          <div id="for-colleges">
            <h2 className="hd-1">For colleges</h2>
            <p className="lede mt-3">
              One place to publish everything that is currently pinned to corridor boards, forwarded on WhatsApp groups and repeated in class.
            </p>
            <dl className="mt-6 space-y-4">
              <Term t="Separate admin space">Your college&apos;s admins, departments and content are isolated from every other college on the platform.</Term>
              <Term t="Roles that match how colleges work">College admins manage everything. Department admins can post only for their own department.</Term>
              <Term t="Your branding">Logo, cover photo, accent colour, welcome text and the sections shown on your home page.</Term>
              <Term t="Simple analytics">Notices this month, most-read notices and which departments are posting.</Term>
            </dl>
            <div className="mt-8 border-t border-line pt-6">
              <AddressChecker />
            </div>
          </div>
          <div id="for-students">
            <h2 className="hd-1">For students</h2>
            <p className="lede mt-3">
              Search for your college at the top of this page, or type its address into the browser. That is the whole setup.
            </p>
            <dl className="mt-6 space-y-4">
              <Term t="No sign-up">Public notices, events and department pages are open to read without an account.</Term>
              <Term t="Made for phones">Pages load quickly on mobile data and are readable on small screens.</Term>
              <Term t="Nothing missed">Urgent notices stay at the top, and new notices appear while the page is open.</Term>
              <Term t="Only your year">Pick your year to see the notices meant for you, along with the ones for everyone.</Term>
              <Term t="Find old notices">Search every live notice by keyword, category or department, and download attachments.</Term>
            </dl>
          </div>
        </div>
      </section>

      <section id="features" className="page-width py-14 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
          <div>
            <h2 className="hd-1">What each portal includes</h2>
            <p className="lede mt-2">Every college on NotifyHub gets the same tools. There are no feature tiers.</p>
          </div>
          <dl className="divide-y divide-line border-y border-line">
            {FEATURES.map(([t, d]) => (
              <div key={t} className="grid gap-1 py-4 sm:grid-cols-[220px_1fr] sm:gap-6">
                <dt className="font-extrabold">{t}</dt>
                <dd className="text-ink-2">{d}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="page-width grid gap-10 py-14 sm:py-20 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="hd-1">One platform, a separate portal for each college</h2>
            <p className="lede mt-3">
              Every college is its own tenant. The database checks every request against the college it belongs to, so one college&apos;s admins can never read or change another college&apos;s data.
            </p>
            <p className="mt-4 text-ink-2">
              Portals are created only after the college proves ownership. Details found on a website help fill in the form but never count as proof on their own.{" "}
              <Link href="/verification" className="link">How verification works</Link>
            </p>
          </div>
          <div className="self-center">
            <p className="text-[0.875rem] font-bold text-ink-3">Example addresses</p>
            <ul className="mt-2 divide-y divide-line rounded-lg border border-line">
              {[
                ["vits", "Demo college with sample data"],
                ["yourcollege", "Your notices, departments and admins"],
                ["anothercollege", "Its own notices, departments and admins"],
              ].map(([slug, note]) => (
                <li key={slug} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3.5">
                  <span className="text-[1.0625rem] font-extrabold break-all">
                    {slug}
                    <span className="font-normal text-ink-3">.{ROOT_DOMAIN_LABEL}</span>
                  </span>
                  <span className="text-[0.875rem] text-ink-2">{note}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-ink text-white">
        <div className="page-width flex flex-col items-start justify-between gap-6 py-12 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-[1.5rem] font-extrabold tracking-[-0.01em]">Set up your college&apos;s portal</h2>
            <p className="mt-1 text-white/75">You need the official website address and access to an official college email or the website itself.</p>
          </div>
          <Link href="/connect-college" className="btn min-h-12 bg-white px-5 text-ink hover:bg-canvas">
            Connect your college
          </Link>
        </div>
      </section>
    </>
  );
}

function Term({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-extrabold">{t}</dt>
      <dd className="mt-0.5 text-ink-2">{children}</dd>
    </div>
  );
}
