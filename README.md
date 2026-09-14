# Basera (بصيرة) — website

Corporate training, OD consulting and learning platform for companies in Saudi Arabia.

## What's here
- `index.html` — the marketing site (EN/AR, course search, certificate check, AI career coach). No build step.
- `learn.html` — the learning portal (sign in, enrol, lessons, quizzes, progress, certificates). No build step.
- `admin.html` — the staff control panel (everything on the platform, read plus a few safe writes). No build step.
- `.github/workflows/deploy.yml` — publishes to GitHub Pages on every push to `main`.

## Run locally
Open `index.html` in a browser, or:
```
python3 -m http.server 8080
```

## Deploy
1. Push to `main`.
2. In the repo: Settings → Pages → Source: **GitHub Actions**.
3. The Actions tab shows the deploy; the URL is `https://<user>.github.io/<repo>/`.

## Learning portal (`learn.html`)
Single file, same tokens and EN/AR handling as the marketing site. Talks to Supabase over
REST with the user's own access token, so every row it sees is the one RLS allows.

- **Sign up / sign in** — Supabase email + password. Sign-up takes an optional company
  join code, which the `handle_new_user` trigger resolves to an organization.
- **The first account ever created becomes `admin`.** Register the owner account before
  giving the link to anyone else.
- **Enrol** — writes to `enrollments`; the `enr_set_org` trigger fills in `org_id`.
- **Lessons** — text lessons have a *Mark as complete* button; quiz lessons are graded in
  the browser and need **70%** to clear (change `PASS_MARK` in the file).
- **Progress and certificates are not computed in the front-end.** Completing a lesson
  writes one `lesson_progress` row; the `recompute_progress` trigger updates
  `enrollments.progress_pct`, flips status to `completed` at 100%, and issues the
  certificate. The portal only reads the result.

## Control panel (`admin.html`)
Staff only. Needs a signed-in account whose `profiles.role` is `admin`; anything else gets
a "not an administrator" screen. Shares the session key with `learn.html`, so signing in on
one signs you in on the other.

Eight views — overview, learners, enrolments, certificates, courses, organizations, leads,
career-coach logs — each searchable, sortable, and exportable to CSV.

It writes through RLS rather than a service key: every request carries the admin's own
token, so the `*_admin` policies are what actually permit the change. From the tables you can

- change a user's role (you cannot remove your own admin role),
- publish or hide a course,
- revoke or restore a certificate,
- move a lead through new → contacted → qualified → won/lost.

Not linked from the public site; the URL is `/admin.html`.

## Backend (Supabase project `basera`, eu-central-1)
- Tables: `courses` (public read), `certificates` (lookup only via `verify_certificate(code)` RPC), `leads` (public insert), `coach_logs`.
- Learning tables: `profiles`, `organizations`, `lessons`, `enrollments`, `lesson_progress` — all RLS'd to the signed-in user, their org (`client_admin`), or `admin`.
- Edge Function `career-coach`: holds the Anthropic key server-side, answers from the live catalogue, logs each exchange.
- Required secret: `ANTHROPIC_API_KEY` (Dashboard → Edge Functions → Secrets). **Not set yet** — the function currently returns `500 ANTHROPIC_API_KEY not set` and the site falls back to keyword matching.
- The anon key in `index.html` is public by design; row-level security protects the data.

## Before going live
- Replace `hello@basera.sa` and the phone number in the contact section.
- Add real courses to `courses` and real certificates to `certificates`; the demo code `BSR-2026-00417` can be deleted.

## Custom domain
Add a `CNAME` file containing the domain, then point DNS at GitHub Pages.
