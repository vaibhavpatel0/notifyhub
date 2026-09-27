import type { Metadata } from "next";
import { DocPage } from "@/components/platform/DocPage";
import { SUPPORT_EMAIL } from "@/lib/env";

export const metadata: Metadata = { title: "Terms of service" };

export default function Terms() {
  return (
    <DocPage title="Terms of service" intro="The terms that apply when a college uses NotifyHub." updated="27 September 2026">
      <h2>Using NotifyHub</h2>
      <p>
        A college may use NotifyHub to publish notices, events and information to its students, staff and the public. The person who registers a
        college confirms that they are authorised to act for it.
      </p>
      <h2>Verification</h2>
      <p>
        We publish a portal only after the college has been verified. We may suspend or remove a portal if verification turns out to be false, if
        the college asks us to, or if the portal is used in breach of these terms.
      </p>
      <h2>Content</h2>
      <p>
        Colleges are responsible for what they publish, including accuracy, attachments and any personal data in notices. Do not publish content
        that is unlawful, that infringes others&apos; rights, or that exposes students&apos; personal information beyond what is necessary.
      </p>
      <h2>Accounts</h2>
      <p>
        Keep passwords confidential and remove admins who leave the college. College admins are responsible for the access they grant to
        department admins.
      </p>
      <h2>Availability</h2>
      <p>
        We work to keep portals available at all times but cannot promise uninterrupted service. Important decisions, such as examination
        arrangements, should also be communicated through the college&apos;s official channels.
      </p>
      <h2>Changes and contact</h2>
      <p>
        We will notify college admins of material changes to these terms. Questions: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </DocPage>
  );
}
