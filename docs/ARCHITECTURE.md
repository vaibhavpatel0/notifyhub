# NotifyHub architecture

## 1. Shape of the system

```
                      ┌──────────────────────── one Next.js deployment ────────────────────────┐
 notifyhub.in    ───▶ │ (platform) landing · connect-college · login · legal · /super-admin    │
 vits.notifyhub.in ─▶ │ proxy.ts rewrites to /s/vits/...  → portal pages and /admin            │
 cbit.notifyhub.in ─▶ │ proxy.ts rewrites to /s/cbit/...                                      │
                      └───────────────┬───────────────────────────────┬────────────────────────┘
                                      │ anon / user JWT (RLS applies) │ service role (server only)
                                      ▼                               ▼
                      Supabase: Postgres + RLS · Auth · Storage (college-files) · Realtime
```

- **Tenant resolution** (`src/proxy.ts`, `src/lib/tenant.ts`): the host `vits.notifyhub.in`
  is rewritten internally to `/s/vits/...`. The URL in the browser does not change. Pages
  load the college by slug. Nested subdomains, look-alike hosts and reserved words
  (`www`, `admin`, `api`, ...) never resolve to a tenant. With
  `NEXT_PUBLIC_USE_SUBDOMAINS=false` the same routes are served at `/s/<slug>`.
- **No per-college deployment or DNS.** A wildcard domain points at one deployment.

## 2. Data model

| Table | Purpose | Public read? |
|---|---|---|
| `colleges` | tenant: identity, branding, status, verification | only `status = 'active'` |
| `departments` | per college; `unique (id, college_id)` for composite FKs | active departments of active colleges |
| `admins` | membership: `college_admin` or `department_admin` (+ department) | no |
| `announcements` | scope `college`/`department`, category, urgent, important, schedule, expiry, circular number | only published, started, not expired |
| `events` | scope, start/end (timestamptz, entered in the college's timezone), venue, organiser, registration link, countdown | published only |
| `college_onboarding` | private contact details and progress of a registration | no |
| `website_analysis` | what the analyser found (unverified) | no |
| `verification_tokens` | one-time codes, stored as HMAC hashes, attempts, expiry | no |
| `notifications` | in-app notifications per admin | own rows only |
| `activity_logs` | written by triggers for every change | college admins (own college), staff |
| `platform_admins`, `platform_settings` | staff and platform switches | no |

Integrity rules enforced by the database, not the app:

- Department rows referenced from `announcements`, `events` and `admins` are composite
  foreign keys on `(department_id, college_id)`, so a row can never point at another
  college's department.
- `scope = 'department'` if and only if `department_id` is set.
- `college_id` can never be changed on an existing row (trigger).
- A website domain can be verified by only one college (partial unique index).
- A college always keeps at least one active college admin (trigger).
- College admins cannot change their slug, status, verification fields, official
  website or demo flag (trigger); only staff can.

## 3. Authorisation (Row Level Security)

Helper functions (`SECURITY DEFINER`, answer only about `auth.uid()`):
`is_platform_admin()`, `is_college_member(college)`, `is_college_admin(college)`,
`can_manage_content(college, department)`.

| Actor | Can |
|---|---|
| Visitor (anon) | read active colleges, their active departments, live announcements, published events; call `search_announcements`, `record_announcement_view`, `slug_available`, `portal_status`. No write privileges at all (revoked at the grant level as well as by RLS). |
| Department admin | everything a visitor can, plus read their college's content; create, edit and delete announcements and events **only where `department_id` is their department**. Cannot create college-wide content, change departments, or see the team. |
| College admin | manage their college's profile (not identity fields), departments, team, all content; read activity. |
| Staff | everything, through `is_platform_admin()` policies; approve, reject, suspend, reinstate. |

Server actions always write with the signed-in user's Supabase client, so a forged
request is rejected by Postgres. The service-role key is used only where no user exists
yet (onboarding, OTP storage), for the Auth admin API (creating/inviting users), and
behind an explicit authorisation check.

`tests/db/rls.test.ts` runs the migration on real Postgres and asserts these rules as each
actor (32 cases, including cross-tenant reads, writes and moves, storage paths, and
server-only functions).

## 4. Onboarding and verification

```
details ─▶ analyse website ─▶ review ─▶ verify ownership ─▶ choose address ─▶ admin account ─▶ published
   1              2               3        4 (code) / 5          6                 7              8
```

- Progress is tied to the browser by an httpOnly cookie `<collegeId>.<token>`; only a
  SHA-256 of the token is stored. Registrations expire after 7 days.
- **Website analysis** (`src/lib/onboarding/`) streams progress to the page as NDJSON. It
  reads the home page plus up to five same-site pages (about, contact, departments,
  administration, admissions), honours `robots.txt`, identifies as `NotifyHubBot`, and never
  signs in or submits forms. Extraction: name, logo, description, address, phones, emails,
  departments, social links.
- **SSRF protection:** only http/https on ports 80/443; every DNS answer is checked at
  connect time (private, loopback, link-local, CGNAT and metadata ranges are refused,
  including DNS rebinding); redirects are re-validated; responses are size- and time-capped.
- **Ownership:** analysis never counts as proof. Accepted proof:
  - 6-digit code to an address **on the college's domain** (free-mail refused). If that
    address is published on the official site, the college is verified; otherwise it goes
    to manual review (a student or staff mailbox proves domain access, not authority).
  - DNS TXT at `_notifyhub.<domain>` or a `<meta name="notifyhub-verification">` tag on the
    home page: verified.
  - Manual review by staff, who must use contact details from the official website.
  - Codes: HMAC-SHA256 with `OTP_SECRET`, 10-minute expiry, 5 attempts, 60-second resend
    cooldown, 5 codes per hour.
- **Addresses:** suggestions from the short name, initials (`vits`), website domain label and
  name variants, filtered for shape, reserved words and availability; a custom address is
  checked live. The address is reserved when chosen and released by the clean-up job if the
  registration is abandoned.
- **Publishing:** verified colleges go live immediately unless staff have switched on
  "review every college"; others wait in *Pending verifications*.

## 5. Public portal

- Server-rendered pages with per-college metadata (`VITS - College Announcements | NotifyHub`),
  canonical URLs, Open Graph images from the cover photo; demo tenants are `noindex`.
- **Realtime:** `LiveUpdates` subscribes to `announcements` and `events` filtered by
  `college_id`. RLS decides what each visitor receives. A change refreshes the server
  components; a new notice also shows a small banner.
- **Search:** `search_announcements` (security invoker) combines full-text search
  (`tsvector` on title, category, description) with partial matches on title, category and
  department name/code; filters by category, department, urgency; sorts by latest (urgent
  first), oldest or closing soonest; paginated.
- Countdown timers render client-side only (no hydration mismatch) and switch to
  "Happening now" and "This event has ended". Events export to `.ics`.
- "New since your last visit" is stored in the visitor's own browser only.

## 6. Files

One public-read bucket `college-files`, paths `<college_id>/<kind>/<uuid>-<name>`.
The bucket enforces the 10 MB limit and MIME allow-list; a storage policy only lets members
write into their own college's folder. Server actions accept only URLs inside that folder,
so arbitrary links cannot be injected as "attachments". Attachments of drafts are reachable
by anyone who has the exact URL (random UUID path); move them to a private bucket with signed
URLs if that matters for a college.

## 7. Extending later

| Future feature | Where it plugs in |
|---|---|
| Email / WhatsApp / push notifications | `notifications` rows are already created by triggers; add a dispatcher (Supabase Edge Function or queue) that reads new rows and sends through `src/lib/email.ts`-style channel adapters |
| Student subscriptions | new `subscriptions (college_id, department_id, channel, address)` table with RLS; dispatcher fans out |
| Plans and billing | `plans` + `college_subscriptions`; gate features in server actions and with RLS checks on plan |
| Custom categories | `announcements.category` already accepts any slug; add a `categories (college_id, slug, label)` table |
| SSO / ERP / attendance | per-college `integrations` table; the tenant boundary (`college_id`) is already on every row |
| Mobile app | the same Supabase RLS applies to any client; the public RPCs are ready for an app |
| Read analytics | `record_announcement_view` is the single entry point; replace with an events table |
| AI summaries / translation | a nullable `summary`/`translations jsonb` on announcements, generated server-side on publish |
