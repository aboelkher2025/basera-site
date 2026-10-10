# Basera (بصيرة)

Corporate training, OD consulting and a learning platform for companies in Saudi Arabia.
Bilingual (English / Arabic, RTL), no build step, static front end on GitHub Pages,
Supabase behind it.

Live: https://aboelkher2025.github.io/basera-site/

## Layout

```
public/                 everything that is deployed (GitHub Pages serves this folder)
  index.html            marketing site
  learn.html            learner portal
  admin.html            control panel (staff)
  privacy.html          legal pages, bilingual
  terms.html
  css/tokens.css        the one palette and radius/shadow set every page shares
  css/site.css          marketing site
  css/portal.css        learner portal
  css/admin.css         control panel  (+ admin-nav.css for the role-aware top nav)
  css/legal.css         privacy and terms
  js/config.js          contact details and portal URL - edit here, not in markup
  js/motion.js          generated "video" backgrounds (canvas) for the marketing site
  js/site.js            marketing site: i18n, course search and detail, certificate check, lead form
  js/portal.js          learner portal: auth, catalogue, lessons, quizzes, certificates, account
  js/admin/core.js      panel: session, REST, routing, role gating, tables, forms
  js/admin/views.js     panel: dashboard, accounts, companies, courses, lessons, enrolments, progress, certificates, leads
  js/admin/delivery.js  panel: cohorts (sessions, roster, attendance), modules, announcements, learning paths
  js/admin/access.js    panel: Users & access (super admin only)
  js/admin/reports.js   panel: ten reports with CSV export
  js/admin/db.js        panel: generic browser over every table the API exposes
supabase/               the backend, synced to the project by Supabase's GitHub integration
  config.toml
  migrations/           full history, one file per applied version, byte-identical to what ran
  functions/admin-users account create / delete / password, service role held server-side
tests/panel-harness.html  the panel on a mock backend, for QA without credentials
docs/qa-report.md       the latest QA pass
docs/lms-research.md    what an LMS is made of, the gap analysis, and the roadmap this build follows
.github/workflows/      deploys public/ to GitHub Pages on push and on manual dispatch
```

## Run locally

Serve the repository root and open `/public/index.html`:

```
python3 -m http.server 8099
```

The panel harness is at `/tests/panel-harness.html?role=super_admin`.

## Deploy

**Front end.** Push to `main`. The workflow uploads `public/`. If a push-triggered run sits in
`queued` without a runner, trigger it by hand - `gh workflow run "Deploy to GitHub Pages"` or
the Actions tab - which has always started immediately.

**Cache stamps.** GitHub Pages caches every file for ten minutes. Every `<link>` and `<script>`
tag in the pages carries `?v=<stamp>` so a page and its assets always change together. When you
change any CSS or JS, bump the stamp in the pages that use it (one value, currently
`20261010e`, used everywhere).

**Backend.** The project is connected to this repository through Supabase's GitHub integration,
which runs `supabase db push` and deploys `supabase/functions/` on each push to `main`.
`supabase/migrations/` must therefore contain every version the database has, named
`<version>_<name>.sql` exactly as `supabase_migrations.schema_migrations` records them. Never
edit or rename an applied file; add a new one. Applying SQL from the dashboard still works, but
add the same SQL as a migration file afterwards so the two stay in step. Secrets are never in
the repo.

## What the platform models

Following the structure every LMS shares (see `docs/lms-research.md`):

- **Learning path** → **Course** → **Module** → **Lesson** (text, video, PDF or quiz). Modules
  group lessons; the learner's course page shows the outline with progress per module.
- **Cohort** — a scheduled run of a course: dates, venue or meeting link, trainer, company,
  capacity, status, with **sessions** and **attendance** per session. A learner's enrolment
  can be seated in a cohort; the portal shows the next session and a join link.
- **Announcements** — to everyone, one company, or one cohort; shown on the learner dashboard.
- **Certificates** carry an optional `valid_until`, set from the course's
  `valid_for_months`, so recertification is a report away.

Staff add, edit and delete all of it from the panel; trainers run their own cohorts
(sessions, attendance, cohort announcements); company leads see their company's cohorts
and attendance. The Database page still gives staff raw access to every table.

## Account types

| Type | `profiles.role` | Can |
|---|---|---|
| Super admin | `super_admin` | Everything, including creating, promoting and deleting admins. |
| Admin | `admin` | Everything except managing admin accounts. |
| Trainer | `trainer` | Read their assigned courses, the learners on them, and those learners' progress. |
| Company lead | `client_admin` | See their own company's learners, enrolments, progress and certificates. |
| Learner | `learner` | Enrol, learn, earn certificates. |
| Partner | `partner` | External partner account. |

**The first account ever created becomes `super_admin`.** Every page in the panel declares
which types may open it; the top nav shows only those, and a forbidden address is rewritten
to the account's first page. The database enforces the same rules through row-level security
and a guard trigger: only a super admin can grant or remove admin roles, and the last super
admin can be neither demoted nor deleted.

## How the pieces talk

Every request from every page carries the signed-in user's own token (or the public anon
key), so row-level security decides what comes back. No page holds a service key. The one
thing the browser cannot do - create or delete an auth user - goes through the `admin-users`
Edge Function, which re-checks the caller's role on every call.

Progress, completion and certificate issue are not computed in the browser: completing a
lesson writes one `lesson_progress` row and the `recompute_progress` trigger does the rest.

Invitation and password-reset links land on `learn.html`, which reads the tokens from the
URL fragment and shows a set-password screen. For those emails to point at the right place,
set **Authentication → URL configuration → Site URL** in the Supabase dashboard to the portal
URL.

## Before going live

- Real contact details in `public/js/config.js` (the current values are placeholders).
- Have `privacy.html` and `terms.html` reviewed by counsel; they are plain-language drafts.
- The "Completion by department" panel on the site is labelled as a sample report; replace it
  with a real one when there is data to show.
