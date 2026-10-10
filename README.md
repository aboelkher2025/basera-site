# Basera (بصيرة) — website

Corporate training, OD consulting and learning platform for companies in Saudi Arabia.

## What's here
- `index.html` + `motion.js` — the marketing site (EN/AR, generated motion backgrounds, course search, certificate check, FAQ). No build step.
- `learn.html` — the learning portal (sign in, enrol, lessons, quizzes, progress, certificates). No build step.
- `admin.html` + `admin*.js` / `admin.css` — the staff control panel: every table, dashboards, reports, account management.
- `supabase/` — migrations, Edge Functions and config; synced to the project by the GitHub integration.
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

## Design system and motion
One visual language across all three surfaces: IBM Plex Sans Arabic, the petrol / mint /
saffron palette with a teal accent (`#0C8FA3`), pill buttons, lifted cards, numbered
section eyebrows, and a fade-up on every view change.

`motion.js` draws the "video" backgrounds on the marketing site. There are no video files:
each section has `<div class="bg" data-motion="aurora|waves|particles|grid|orbit|topo"
data-tone="dark|petrol|light|mint">` and the engine renders it on a canvas. Canvases only
animate while on screen, cap the device pixel ratio at 1.5, and draw one still frame when
the visitor prefers reduced motion. To use real footage later, put a `<video>` inside the
same `.bg` element; the canvas becomes the poster.

The portal and control panel share the system but carry no background motion - people
read and work there.

## Learning portal (`learn.html`)
Single file, same tokens and EN/AR handling as the marketing site. Talks to Supabase over
REST with the user's own access token, so every row it sees is the one RLS allows.

- **Sign up / sign in** — Supabase email + password. Sign-up takes an optional company
  join code, which the `handle_new_user` trigger resolves to an organization.
- **The first account ever created becomes `super_admin`.** Register the owner account before
  giving the link to anyone else.
- **Enrol** — writes to `enrollments`; the `enr_set_org` trigger fills in `org_id`.
- **Lessons** — text lessons have a *Mark as complete* button; quiz lessons are graded in
  the browser and need **70%** to clear (change `PASS_MARK` in the file).
- **Progress and certificates are not computed in the front-end.** Completing a lesson
  writes one `lesson_progress` row; the `recompute_progress` trigger updates
  `enrollments.progress_pct`, flips status to `completed` at 100%, and issues the
  certificate. The portal only reads the result.

## Control panel (`admin.html`)
Staff only: needs a signed-in account whose `profiles.role` is `admin` or `super_admin`;
anything else gets a "not a staff account" screen. Shares the session key with `learn.html`.
Split into `admin.html` (shell), `admin.css`, `admin.js` (core), `admin-views.js`,
`admin-reports.js` and `admin-db.js`. No build step.

**Account types** (icons in the top-left strip, with live counts):

| Type | `profiles.role` | Can |
|---|---|---|
| Super admin | `super_admin` | Everything. The only type that can create, promote or delete admins. |
| Admin | `admin` | Everything except managing admin accounts. |
| Trainer | `trainer` | Read their assigned courses, the learners on them, and those learners' progress. |
| Company lead | `client_admin` | Manage their own company's learners (portal side). |
| Learner | `learner` | Enrol, learn, earn certificates. |
| Partner | `partner` | External partner account (kept from the original schema). |

Companies are `organizations`; they appear in the same strip.

**Views**: Dashboard (tiles + six charts), Reports (ten reports, CSV export), Accounts,
Companies, Courses, Lessons (with a quiz editor), Enrolments, Progress (per-lesson mark /
unmark, reset), Certificates (revoke, restore, issue by hand), Leads, and
Database - a generic browser over every table PostgREST exposes, with insert / edit / delete.

**Every read and write goes through RLS with the signed-in user's own token.** The panel
never holds a service key. Creating and deleting *accounts* is the one thing the browser
cannot do, so that goes through the `admin-users` Edge Function, which re-checks the
caller's role on every call.

**The first account ever created becomes `super_admin`.** Register the owner before
sharing any link.

### Backend: the `supabase/` folder is the source of truth
The project is connected to this repository through Supabase's GitHub integration. On
every push to `main` it runs `supabase db push` and deploys every function under
`supabase/functions/`. So:

- `supabase/migrations/` holds the full migration history, one file per applied version,
  named `<version>_<name>.sql` exactly as recorded in `supabase_migrations.schema_migrations`.
  Never rename or edit an applied file; add a new one. A file the database has not seen is
  applied on the next push - which is how schema changes ship from now on.
- `supabase/functions/admin-users/` is deployed on every push. Edit them here, not in the dashboard, or the next push overwrites the change.
- `supabase/config.toml` carries the project id and `verify_jwt` for the function.
- Secrets are never in the repo.

Applying SQL from the dashboard editor still works, but then add the same SQL as a
migration file so the repo and the database stay in step.

For invitation and password-reset emails to land correctly, set **Authentication -> URL
configuration -> Site URL** to the portal URL and add it to the redirect allow-list.
`learn.html` handles the `#access_token=...&type=invite|recovery` fragment and shows a
set-password screen.

## Backend (Supabase project `basera`, eu-central-1)
- Tables: `courses` (public read), `certificates` (lookup only via `verify_certificate(code)` RPC), `leads` (public insert).
- Learning tables: `profiles`, `organizations`, `lessons`, `enrollments`, `lesson_progress` — all RLS'd to the signed-in user, their org (`client_admin`), or `admin`.
- The anon key in `index.html` is public by design; row-level security protects the data.

## Before going live
- Replace `hello@basera.sa` and the phone number in the contact section.
- Add real courses to `courses` and real certificates to `certificates`; the demo code `BSR-2026-00417` can be deleted.

## Custom domain
Add a `CNAME` file containing the domain, then point DNS at GitHub Pages.
