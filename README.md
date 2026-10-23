# Nata Studio — client portal

A small, calm portal where clients see where their project is, what's next, and where their money is at.
Clients sign in with an emailed link or 6-digit code (no passwords). The admin (the studio) manages everything.

**Stack:** Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 · Supabase (Postgres database, Auth, Storage) · Vercel.

---

## How access control works

Read this first. Everything else depends on it.

- **Row Level Security (RLS)** is switched on for every table. RLS is a set of rules inside Postgres that decides,
  row by row, what each signed-in user may read or change. If no rule allows something, it's denied.
  The rules apply to every query, whatever the UI does.
- **Admins** are the users listed in the `admins` table. They can read and write everything.
- **Clients** can only *read* rows belonging to projects where `projects.client_id` is their own user id.
- Clients have **no insert/update/delete rules at all**. Their one write, answering an approval, goes through the
  database function `respond_to_approval()`. That function checks ownership, accepts only one answer per request,
  and requires a comment when changes are requested.
- **Logged-out visitors** have no table privileges whatsoever.
- **Files** live in one *private* Storage bucket, in folders named after the project id. They're only reachable
  through **signed URLs** (temporary links that expire: 60 seconds for downloads, 10 minutes for images on a page),
  and creating a signed URL goes through the same read rule.
- **Signups are off.** The only way to get an account is to be invited by the admin.
- The **secret key** (Supabase's master key, which bypasses RLS) is used in exactly one place in the app: creating a
  login for a new client (`src/lib/supabase/admin.ts`, guarded so it can never be bundled into browser code).
  Every other query, including admin actions, runs as the signed-in user, so RLS applies to the admin too.

Everything is defined in [`supabase/migrations/20261023000000_portal_schema.sql`](supabase/migrations/20261023000000_portal_schema.sql)
and tested in [`supabase/tests/rls.test.sql`](supabase/tests/rls.test.sql) (33 checks: client A vs client B,
logged-out visitors, attempts to edit stages, payments and approvals, storage access, and more).

---

## Local setup

You need **Node.js 20+** and **Docker** (the local Supabase runs in Docker containers).

```bash
npm install
npm run db:start        # starts local Supabase (first run downloads images, takes a few minutes)
cp .env.example .env.local
```

`npm run db:start` prints a **Publishable key** and a **Secret key**. Put them in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
```

Then:

```bash
npm run seed            # demo admin + client + a project halfway through
npm run dev             # http://localhost:3000
```

**Signing in locally:** go to http://localhost:3000/login and enter `admin@natastudio.test` (admin) or
`client@example.com` (client). No real email is sent. Open **Mailpit**, a local inbox that catches outgoing
emails, at http://127.0.0.1:54324, then click the link or type the code.

> Use `localhost:3000`, not `127.0.0.1:3000`. Login cookies are tied to the hostname.

### Handy commands

| Command | What it does |
|---|---|
| `npm run db:test` | Runs the access-control tests against the local database |
| `npm run db:reset` | Wipes the local database, re-applies migrations, re-seeds |
| `npm run db:types` | Regenerates TypeScript types after a schema change |
| `npm run make-admin -- you@studio.com` | Makes an email an admin (creates the login if needed) |
| `npm run typecheck` / `npm run lint` | Type and lint checks |
| `npm run db:stop` | Stops the local Supabase containers (data is kept) |

Supabase Studio (a web UI for browsing the local database) is at http://127.0.0.1:54323.

---

## Environment variables

| Name | Where it's used | Secret? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server | No. It identifies the project. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser + server | No. It's safe in the browser because RLS protects the data. |
| `SUPABASE_SECRET_KEY` | Server only (creating client logins) and the scripts | **Yes.** Never prefix it with `NEXT_PUBLIC_`. |
| `SEED_ADMIN_EMAIL`, `SEED_CLIENT_EMAIL` | `npm run seed` only | No |

Variables starting with `NEXT_PUBLIC_` are copied into the browser bundle. Anything else stays on the server.

---

## Supabase setup (production)

1. **Create a project** at [supabase.com](https://supabase.com). Pick a region near your clients.

2. **Apply the schema** from your machine:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>   # the ref is in the project URL
   npx supabase db push                                 # applies supabase/migrations
   ```
   This creates the tables, the RLS rules, the functions and the private `project-files` bucket.

3. **Authentication settings** (Dashboard → Authentication):
   - *Sign In / Providers*: turn **off** "Allow new users to sign up". Keep the **Email** provider **on**.
   - *Email* provider: set the **Email OTP expiration** to `900` seconds (15 minutes) and the **OTP length** to `6`.
     (OTP = one-time password, the 6-digit code.)
   - *URL Configuration*: set **Site URL** to your portal's address, e.g. `https://portal.natastudio.com`.
     Add the same address followed by `/**` under **Redirect URLs**.
   - *Emails → Templates → Magic Link*: subject `Your Nata Studio sign-in`. For the body, paste the contents of
     [`supabase/templates/magic_link.html`](supabase/templates/magic_link.html). This template includes both the
     link and the 6-digit code. Clients reading email on a phone often open links in their mail app's built-in
     browser; the code lets them sign in from any browser.

4. **Custom email sending (SMTP)**. Required before inviting real clients. Supabase's built-in sender is for testing
   only and allows just a few emails per hour. SMTP is the standard protocol for sending email. Create an account with
   a sender like [Resend](https://resend.com) or [Postmark](https://postmarkapp.com), verify your domain, then enter
   its SMTP details under Dashboard → Authentication → Emails → SMTP Settings. Afterwards, raise the email rate limit
   (Authentication → Rate Limits) to something like 30/hour.

5. **Get your keys** from Dashboard → Project Settings → API Keys: the **publishable** key and a **secret** key.

6. **Make yourself admin.** Put the production values in a file that is never committed
   (`.env.production.local` is already git-ignored):
   ```bash
   node --env-file=.env.production.local --import tsx scripts/make-admin.ts you@natastudio.com
   ```
   Don't run `npm run seed` against production. It creates demo users.

## Deploying to Vercel

1. Push this repository to GitHub (or GitLab/Bitbucket).
2. In [Vercel](https://vercel.com), choose **Add New → Project** and import the repository. The defaults are correct.
3. Under **Environment Variables**, add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and
   `SUPABASE_SECRET_KEY` with your production values.
4. Deploy. If you use a custom domain, add it under Project → Settings → Domains. Make sure Supabase's **Site URL**
   (step 3 above) matches the final address. Sign-in links are built from it.
5. Sign in at `/login` with your admin email and create your first project.

Schema changes later: add a new file in `supabase/migrations/`, test locally with `npm run db:reset && npm run db:test`,
then run `npx supabase db push`.

---

## Where things are

```
supabase/
  migrations/…_portal_schema.sql   tables, 8-stage template trigger, RLS, storage rules, functions
  tests/rls.test.sql               access-control tests (pgTAP, a testing tool for Postgres)
  templates/magic_link.html        sign-in email
  config.toml                      local Supabase settings
scripts/seed.ts, make-admin.ts     demo data and admin helper
src/
  proxy.ts                         keeps the session fresh and redirects logged-out visitors (not the security boundary)
  lib/supabase/                    server, browser and admin clients
  lib/auth.ts                      "who is this?" + requireAdmin / requireClient
  lib/progress.ts                  % complete, current stage, what's next, payment state, revision rounds
  app/login, app/auth/confirm      sign-in by code or link
  app/portal/[projectId]/…         client view: overview, updates, approvals, files
  app/admin/…                      dashboard, new project, project editor (+ actions.ts)
```

## Behaviour worth knowing

- **Stages and payments are created automatically** for every new project (deposit tied to stage 2, final payment to stage 7).
- **A payment shows as "due"** once its stage has started, until you set its "Paid on" date.
- **Revision rounds** count every "Request changes" on the project. When the included rounds are used up, the client can
  still request changes, but they're told it will be an extra round.
- **"What's next"** shows, in this order: a pending approval, a payment that's due, then the current stage
  (with your note and due date). Who it's waiting on comes from the stage status.
- **Preview:** on an admin project page, "Preview the client view" shows the client pages read-only.
- **Invite** = the admin creates the client and project, and the client gets a sign-in email. "Resend sign-in email" is on the project page.
- **Uploads:** images for updates and approvals (PNG, JPG, WebP, GIF). Deliverables can also be PDF, ZIP, SVG, EPS,
  up to 50 MB. Put source files such as `.ai` in a ZIP.
