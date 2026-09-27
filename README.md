# NotifyHub

Digital notice boards for colleges. One Next.js application serves the NotifyHub
platform (`notifyhub.in`) and a separate, isolated portal for every college
(`<slug>.notifyhub.in`). Students read without an account; college and department
admins publish; NotifyHub staff verify colleges.

- **Stack:** Next.js 16 (App Router, server actions), React 19, TypeScript, Tailwind CSS 4,
  Supabase (Postgres, Auth, Storage, Realtime), deployable on Vercel.
- **Tenancy:** every tenant row carries `college_id`; Row Level Security in Postgres is the
  security boundary. The UI never relies on its own filtering for access control.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the design, data model and security model.

---

## Quick start (local)

Requirements: Node 20+, a Supabase project (cloud or `supabase start` locally).

```bash
npm install
cp .env.example .env.local           # fill in the Supabase URL and keys, OTP_SECRET

# Database: run the migration, then the demo data, in the Supabase SQL editor
#   supabase/migrations/20260927000001_init.sql
#   supabase/seed.sql                  (optional demo college "vits", clearly marked as sample data)
# or with the Supabase CLI:  supabase db push && psql "$DATABASE_URL" -f supabase/seed.sql

# Demo sign-in accounts (never hard-coded; you choose the password):
set -a; source .env.local; set +a
npm run db:demo-users -- --password 'choose-a-long-password'

npm run dev
```

Open:

| Address | What it is |
|---|---|
| http://localhost:3000 | NotifyHub landing page |
| http://localhost:3000/connect-college | College onboarding |
| http://vits.localhost:3000 | Demo college portal (Chrome resolves `*.localhost` automatically) |
| http://vits.localhost:3000/admin | Demo college admin (`collegeadmin@examplecollege.ac.in` or `cse@examplecollege.ac.in`) |
| http://localhost:3000/super-admin | NotifyHub staff (`ops@notifyhub.local`) |

If subdomains are inconvenient (for example on Vercel preview URLs), set
`NEXT_PUBLIC_USE_SUBDOMAINS=false` and portals are served at `/s/<slug>` instead.

In development without `RESEND_API_KEY`, verification codes are printed to the server log.

## Supabase configuration checklist

1. **Run the migration.** It creates tables, RLS policies, triggers, RPCs, the
   `college-files` storage bucket (10 MB limit, allowed MIME types) and adds
   `announcements`, `events` and `notifications` to the `supabase_realtime` publication.
2. **Auth → URL configuration:** Site URL `https://notifyhub.in`; add redirect URLs
   `https://notifyhub.in/**` and `https://*.notifyhub.in/**`.
3. **Auth → Email templates** (so links work with server-side sessions):
   - *Reset password:* `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`
   - *Invite user:* `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/reset-password`
   - *Confirm signup:* `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/login`
4. **SMTP:** configure a real SMTP provider in Supabase Auth for invites and resets.
5. **Staff accounts:** create the user in Supabase Auth, then
   `insert into platform_admins (user_id) values ('<uuid>');`
6. **Clean-up job (optional, recommended):** enable `pg_cron` and schedule
   `select public.cleanup_abandoned_onboarding();` daily. It releases addresses held by
   registrations abandoned for more than 7 days.

## Deploying on Vercel

1. Import the repository; set the environment variables from `.env.example`
   (`NEXT_PUBLIC_ROOT_DOMAIN=notifyhub.in`, `NEXT_PUBLIC_USE_SUBDOMAINS=true`,
   `NEXT_PUBLIC_PROTOCOL=https`, `NEXT_PUBLIC_COOKIE_DOMAIN=.notifyhub.in`).
2. Add both `notifyhub.in` and the wildcard `*.notifyhub.in` to the project's domains.
   Wildcard domains require Vercel's nameservers for the domain.
3. There is one deployment for all colleges. A new college is live the moment its row
   becomes `active`; no DNS or deploy step per college.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |
| `npm test` | Unit tests: tenant resolution, slugs, email-domain rules, robots.txt, HTML extraction, SSRF guard, timezone handling |
| `npm run test:db` | Runs the real migration against Postgres and checks tenant isolation and RLS as anonymous visitors, college admins, department admins, outsiders and staff. Needs `TEST_DATABASE_URL` (a Postgres superuser URL); uses a small shim for Supabase's `auth`/`storage` schemas |
| `npm run db:demo-users` | Creates the demo sign-in accounts |

## Project layout

```
src/proxy.ts                      subdomain -> tenant rewrite (vits.notifyhub.in/x -> /s/vits/x)
src/app/(platform)/               landing, onboarding wizard, login, legal pages
src/app/s/[college]/(portal)/     public college portal (home, announcements, events, departments, about)
src/app/s/[college]/admin/        college and department admin
src/app/super-admin/              NotifyHub staff
src/app/api/onboarding/analyze/   streaming website analysis
src/lib/onboarding/               analyser, SSRF-safe fetcher, robots.txt, slugs, verification
src/lib/actions/                  server actions (auth, admin, staff)
supabase/migrations/              schema, RLS, triggers, RPCs, storage, realtime
supabase/seed.sql                 demo college (marked is_demo, shown with a sample-data banner)
tests/                            unit and database tests
```

## Notes on the demo data

The seed creates the college requested in the brief ("Vignan Institute of Technology",
slug `vits`) with `is_demo = true`. Every portal page for a demo college shows a banner
saying the content is sample data, search engines are told not to index it, and it never
shows a "verified college" badge. Because a real institution with a similar name exists,
consider renaming the demo (for example "Demo Institute of Technology") before the demo
portal is public.
