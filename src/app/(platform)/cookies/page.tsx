import type { Metadata } from "next";
import { DocPage } from "@/components/platform/DocPage";

export const metadata: Metadata = { title: "Cookie policy" };

export default function Cookies() {
  return (
    <DocPage title="Cookie policy" intro="NotifyHub uses only the cookies needed to run the service. There are no advertising or analytics cookies." updated="27 September 2026">
      <h2>Cookies we set</h2>
      <ul>
        <li><strong>Sign-in session</strong> (names beginning <code>sb-</code>): keeps college and department admins signed in. Set only when you sign in.</li>
        <li><strong>Onboarding progress</strong> (<code>nh_onboarding</code>): remembers a college registration in progress for up to 7 days.</li>
      </ul>
      <h2>Local storage</h2>
      <p>
        Public portals save the time of your last visit in your browser so notices posted since then can be marked as new. It is not sent to us.
      </p>
      <h2>Students and visitors</h2>
      <p>Reading a portal without signing in sets no cookies.</p>
    </DocPage>
  );
}
