import type { Metadata } from "next";
import { DocPage } from "@/components/platform/DocPage";
import { SUPPORT_EMAIL } from "@/lib/env";

export const metadata: Metadata = { title: "College verification", description: "How NotifyHub confirms that a college portal is run by the college itself." };

export default function VerificationInfo() {
  return (
    <DocPage
      title="College verification"
      intro="Students need to trust that a portal really speaks for their college. This page explains how NotifyHub confirms that before a portal is published."
      updated="27 September 2026"
    >
      <h2>Why website details are not enough</h2>
      <p>
        During onboarding NotifyHub reads a college&apos;s public website to pre-fill its details. Anyone can read a public website, so these
        details are only used to save typing. They are never treated as proof that the person connecting the college works there.
      </p>

      <h2>Accepted verification methods</h2>
      <h3>Official email code</h3>
      <p>
        We send a 6-digit code to an address on the college&apos;s own domain (for example <code>principal@yourcollege.ac.in</code>). Codes expire
        after 10 minutes, allow five attempts, and are stored only as a one-way hash. Personal mailboxes such as Gmail are not accepted.
      </p>
      <p>
        If the address is one the college publishes on its official website, verification is complete. If it is another address on the domain
        (for example a personal staff or student mailbox), the email is confirmed but a NotifyHub reviewer also checks the request before the
        portal is published.
      </p>
      <h3>DNS TXT record</h3>
      <p>
        The college&apos;s domain administrator adds a TXT record at <code>_notifyhub.yourcollege.ac.in</code> with a value unique to your
        registration. Only someone who controls the domain can do this.
      </p>
      <h3>Website meta tag</h3>
      <p>
        A tag of the form <code>&lt;meta name=&quot;notifyhub-verification&quot; content=&quot;…&quot;&gt;</code> is added to the home page of the
        official website. It can be removed once verification is complete.
      </p>
      <h3>Manual review</h3>
      <p>
        When none of the above is possible, a NotifyHub reviewer contacts the college using the phone number or email published on its official
        website, not the details supplied in the request.
      </p>

      <h2>One portal per college</h2>
      <p>
        A college domain can be verified by only one NotifyHub portal. If you believe a portal has been created for your college without
        permission, write to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. We can suspend a portal while we investigate.
      </p>

      <h2>How we read websites</h2>
      <p>
        Our reader identifies itself as <code>NotifyHubBot</code>, fetches at most six public pages per registration, respects{" "}
        <code>robots.txt</code>, and never signs in, submits forms, bypasses CAPTCHAs or accesses restricted areas.
      </p>
    </DocPage>
  );
}
