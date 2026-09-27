import type { Metadata } from "next";
import Link from "next/link";
import { DocPage } from "@/components/platform/DocPage";
import { ROOT_DOMAIN } from "@/lib/env";

export const metadata: Metadata = { title: "How it works", description: "How a college joins NotifyHub, verifies ownership and publishes notices." };

export default function HowItWorks() {
  return (
    <DocPage
      title="How NotifyHub works"
      intro="A college connects once, verifies that it is who it says it is, and gets a portal at its own address. After that, admins publish and students read."
    >
      <h2>1. Connect your college</h2>
      <p>
        Start at <Link href="/connect-college">Connect your college</Link> with the college name, the official website and your contact details.
        NotifyHub then reads the website&apos;s public pages: the home page and up to five pages such as About, Contact, Departments,
        Administration and Admissions.
      </p>
      <p>
        The analysis looks for the college name, logo, description, address, phone numbers, public email addresses, departments and social media
        links. It reads only pages that anyone can open, it follows the site&apos;s <code>robots.txt</code>, and it never signs in, fills forms or
        solves CAPTCHAs. If the site cannot be read, you type the details yourself.
      </p>

      <h2>2. Review the details</h2>
      <p>Everything detected is shown to you for correction. Untick departments that were picked up by mistake and add any that were missed.</p>

      <h2>3. Verify ownership</h2>
      <p>
        Details found on a website are public, so they prove nothing about who is submitting them. Before any portal is published, the college
        confirms ownership in one of these ways:
      </p>
      <ul>
        <li><strong>Official email.</strong> A 6-digit code is sent to an address on the college&apos;s own domain. If that address is published on the college website, the college is verified immediately.</li>
        <li><strong>DNS record.</strong> Your IT team adds a TXT record we give you to the college domain.</li>
        <li><strong>Website tag.</strong> A one-line meta tag is added to the college home page.</li>
        <li><strong>Manual review.</strong> A NotifyHub reviewer contacts the college through its published details.</li>
      </ul>
      <p>See <Link href="/verification">College verification</Link> for the details of each method.</p>

      <h2>4. Choose an address</h2>
      <p>
        Pick a short address, usually the college&apos;s initials, such as <code>vits.{ROOT_DOMAIN}</code>. If it is taken, NotifyHub suggests close
        alternatives that are free.
      </p>

      <h2>5. Create the admin account and publish</h2>
      <p>
        The first account becomes the college admin. From the dashboard the admin uploads a logo and cover photo, writes the welcome message, adds
        departments and invites department admins, then publishes notices and events.
      </p>

      <h2>What students do</h2>
      <p>
        Nothing beyond opening the address in a browser. The home page shows urgent notices first, then the latest notices, upcoming events with
        countdowns, departments and contact details. New notices appear on open pages automatically.
      </p>

      <h2>Who can change what</h2>
      <ul>
        <li><strong>College admins</strong> manage the profile, departments, all notices and events, and the team.</li>
        <li><strong>Department admins</strong> publish and edit notices and events for their own department only.</li>
        <li><strong>Students and visitors</strong> can read published content. They cannot change anything.</li>
      </ul>
      <p>These rules are enforced by the database for every request, not only by what the screens show.</p>
    </DocPage>
  );
}
