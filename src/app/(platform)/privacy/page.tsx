import type { Metadata } from "next";
import { DocPage } from "@/components/platform/DocPage";
import { SUPPORT_EMAIL } from "@/lib/env";

export const metadata: Metadata = { title: "Privacy policy" };

export default function Privacy() {
  return (
    <DocPage title="Privacy policy" intro="What NotifyHub collects, why, and what you can do about it." updated="27 September 2026">
      <h2>Who we are</h2>
      <p>
        NotifyHub provides announcement portals to colleges. For content a college publishes on its portal, the college decides what is published
        and NotifyHub processes it on the college&apos;s behalf.
      </p>

      <h2>Students and visitors</h2>
      <p>
        You can read a portal without an account. We do not use advertising or third-party tracking. We count how many times a notice is opened,
        without recording who opened it. Our servers keep standard request logs (such as IP address and browser type) for security and
        troubleshooting for up to 30 days. Your browser stores the time of your last visit locally so the portal can mark notices that are new to
        you; this never leaves your device.
      </p>

      <h2>College administrators</h2>
      <p>We store your name, email address, role and a hashed password to run your account, and a record of the changes you make for accountability within your college.</p>

      <h2>College onboarding</h2>
      <p>
        When a college registers we store the contact person&apos;s name, email and phone number, the result of reading the college&apos;s public
        website, and verification records. One-time codes are stored only as hashes. Incomplete registrations are deleted after 7 days.
      </p>

      <h2>Where data is stored</h2>
      <p>Data is stored with our hosting and database providers under contracts that restrict their use of it. We do not sell personal data.</p>

      <h2>Your choices</h2>
      <p>
        Administrators can update their details from the dashboard. To access or delete personal data, or to ask a question about this policy,
        write to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. Questions about a notice published by a college should go to that
        college.
      </p>
    </DocPage>
  );
}
