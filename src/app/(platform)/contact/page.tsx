import type { Metadata } from "next";
import { DocPage } from "@/components/platform/DocPage";
import { SUPPORT_EMAIL } from "@/lib/env";

export const metadata: Metadata = { title: "Contact" };

export default function Contact() {
  return (
    <DocPage title="Contact NotifyHub" intro="For questions about the platform, college onboarding, verification or your account.">
      <p>
        Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. Include your college name and portal address if you have one.
      </p>
      <h2>Questions about a notice</h2>
      <p>
        Notices are written and published by each college. For questions about an exam date, a fee deadline or any other notice, contact the college
        using the details on its portal&apos;s About page.
      </p>
      <h2>Reporting a portal</h2>
      <p>
        If you believe a portal was created without the college&apos;s permission, or a notice exposes personal information, email us with the
        address of the page. We review reports promptly and can suspend a portal while we investigate.
      </p>
    </DocPage>
  );
}
