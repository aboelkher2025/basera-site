# Basera — QA report (round 3: redesign + modules / cohorts / sessions / attendance / announcements / learning paths)

> **Fixed after this report (same day):** H1 the portal now fetches `cohort_id` (and `org_id`), so the
> session card, join link and upcoming sessions render; H2 trainer-permitted controls (+ Session,
> session Edit/Delete, + New announcement, announcement Edit/Delete) opt back in with `keep-rw`,
> the cohort Edit button is staff-only, and a PATCH that RLS filtered to nothing now reports a
> refusal instead of "Saved"; H3 "Open" is always usable; H4 the skip link is clipped instead of
> placed off-canvas and `html` clips horizontal overflow; M1 the panel prints local time; M2 anonymous
> callers get a column-limited grant on `cohorts` (no meeting link, notes, trainer or company);
> M3 portal certificates show "Valid until" / "Expired" / "Revoked"; M4 trainer reads are also keyed on
> `cohorts.trainer_id`; M5 a seated enrolment carries the learner's `org_id`; M6 attendance changes
> re-render the view; M7 trainers can read the companies they deliver to; L1 stronger overlay and
> white body copy in the hero; L2 `glass-l` renamed `card-l`; L3 legal headings use the display face;
> L4 field errors are `role="alert"` with `aria-describedby`; L5 set-password has a confirm field;
> L6 the add-learner list is learners and company leads only; the photo caption no longer carries
> an instruction. Still open by design: placeholder contact details; S1-S6 in the roadmap.


Tested 2026-10-10 against the local server (`http://localhost:8099`, same files as deployed).
Covered: public site EN + AR at 375 / 768 / 1280, `privacy.html` / `terms.html`, learner portal
(unauthenticated screens + full code trace of the new views), real `admin.html` gate, the control
panel on the mock backend (`tests/panel-harness.html`) for all six account types, and the phase-1
RLS migration compared with what each role's UI offers. Nothing was fixed in this pass. No real
account was created or used; mock-backend writes were confined to the harness; the contact form
was never submitted (empty submit is blocked client-side before any request); `basera_session`
set by the harness and by the invite-link test was removed afterwards.

## Summary

| Severity | Count |
|---|---|
| Blocker | 0 |
| High | 4 |
| Medium | 7 |
| Low | 8 |
| Suggestion | 6 |

**Verdict: not ready to ship the new delivery features; the redesign itself is in good shape.**
The marketing site passes every functional check it passed last round and the redesign is
implemented as specified (Fraunces display type on EN headings, 6 px / 10 px radii, two motion
canvases, plain section labels, photo slot). Two things block a release: (1) the learner never
sees their cohort — the portal does not fetch `cohort_id` on enrolments, so the session card,
join link and "upcoming sessions" aside can never render; (2) the trainer role is wired
backwards against RLS — the panel hides the trainer's session and announcement actions that the
policies allow, and shows an "Edit cohort" button the policies refuse (silent no-op with a
"Saved" toast). Company leads and trainers also cannot open a cohort from the list because the
"Open" button is swallowed by the same read-only CSS. Separately, the Arabic site has a
horizontal-overflow problem that needs confirming on a phone.

## Top issues

1. **H1 — Portal: cohorts invisible to learners.** `getEnrollments()` (portal.js:293) selects
   `id,course_id,status,progress_pct,score,enrolled_at,completed_at` — no `cohort_id`.
   `viewDashboard` (610–612) and `sessionBlock` (775) key everything on `e.cohort_id`, so the
   session card (next session, venue, join link) and the "Upcoming sessions" aside are dead code
   in production. Fix: add `cohort_id` to the select.
2. **H2 — Panel: trainer actions inverted against RLS.** `admin-nav.css:68-70` hides
   `.btn.accent` and `td .btn` for every non-staff body. On a cohort the trainer owns this hides
   "+ Session", session Edit/Delete, "+ New announcement" and announcement Edit/Delete — exactly
   what `session_trainer_write` and `ann_trainer_write` permit — while the cohort "Edit" button
   (`btn light`, not in a td) stays visible although no trainer write policy exists on `cohorts`.
   Reproduced on the harness as trainer: `#/cohorts?cohort=k1` → Edit visible, + Session hidden,
   row buttons hidden. Fix: give the intended trainer controls `keep-rw` (like the attendance
   selects) and gate the cohort Edit button on `canWrite()`.
3. **H3 — Panel: trainers and company leads cannot open a cohort from the list.** The "Open"
   button is a `td .btn`, so `body.readonly` hides it; the only way to reach the detail page is
   to type `#/cohorts?cohort=<id>`. Fix: render Open as a link or mark it `keep-rw`.
4. **H4 — Site AR: horizontal overflow / 1500 px header on phones (needs device confirmation).**
   In RTL the document `scrollWidth` is ~10 000 px at 375, 768 and 1280 (EN is clean at all
   three); at 375 the fixed header lays out 1500 px wide with the menu button and language
   toggle ~940 px off-screen. Measured from the DOM; the pane's renderer was frozen so no
   screenshot could confirm what a user sees. The `.strip-track` marquee (`[dir=rtl]` uses
   `scrollRtl`) and `body{overflow-x:hidden}` on body rather than `html` are the likely cause.
5. **M1 — Panel date/time mismatch.** `A.when` prints UTC (`toISOString`), the forms use
   `datetime-local` in local time. Cohort k1 shows "2026-10-30 18:48" in the table and tiles but
   "2026-10-30T21:48" in the Edit form (Riyadh is UTC+3). A trainer who types 09:00 will see 06:00.
6. **M2 — RLS wider than the UI: `cohort_public_read` exposes `meeting_url`, `notes`,
   `trainer_id`, `org_id`, `capacity` to anonymous callers** of the published anon key. The site
   never fetches cohorts (site.js has no cohort call), so nothing public needs it today. Either
   drop the anon grant until the site lists runs, or expose a view without the meeting link.

## Environment notes

- The sandbox *can* reach `*.supabase.co` this round (a bare `POST /rest/v1/rpc/verify_certificate`
  returned 401 — reachable, unauthenticated). The "no DNS" note from round 2 no longer applies to
  Supabase; `fonts.googleapis.com` was not exercised — Fraunces reports `document.fonts.check` false
  and renders as Georgia here, so type was judged by computed `font-family`.
- The browser pane's window was hidden/minimised for most of the run: screenshots timed out,
  `requestAnimationFrame`, `IntersectionObserver` and native scroll events did not fire. Consequences:
  scroll-spy and the hero canvas resize could not be observed (the scroll handler itself was
  verified by dispatching a synthetic `scroll` event — back-to-top, progress bar and `nav.scrolled`
  all respond); canvases could only be counted and pixel-sampled, not watched.
- Harness fixture note: cohort k1 is 20 days in the future with status `scheduled`; k2 is
  `running` 10 days ago. Attendance on k1 therefore has no fixture rows.

## Findings

| ID | Sev | Page | Steps | Expected | Actual | Fix |
|---|---|---|---|---|---|---|
| H1 | High | Portal dashboard / course | Learner enrolled on a cohort opens course page or dashboard | Session card with next session + join link; "Upcoming sessions" aside | Never rendered: `cohort_id` not selected in `getEnrollments()` (portal.js:293) | Add `cohort_id` to the select |
| H2 | High | Panel, trainer, `#/cohorts?cohort=k1`, `#/announcements` | Sign in as trainer who owns the cohort | + Session, session Edit/Delete, + New announcement, announcement Edit/Delete usable; no cohort Edit | All hidden by `body.readonly` CSS; cohort "Edit" visible but RLS refuses the PATCH (PostgREST returns 0 rows, UI toasts "Saved") | `keep-rw` on trainer-permitted controls; gate cohort Edit on `canWrite()`; check row count after PATCH |
| H3 | High | Panel, trainer + client_admin, `#/cohorts` | Open the list | "Open" per row | Hidden (`td .btn`); detail reachable only by URL | Render Open as `<a>` or `keep-rw` |
| H4 | High (unconfirmed) | Site AR, 375 / 768 / 1280 | Switch to عربي | No horizontal scroll | `scrollWidth` 10 374 px at 375 (EN 375); fixed header 1500 px wide; menu button at x = −941 | `html,body{overflow-x:clip}`; constrain `.strip` with `contain:paint`; verify on a phone |
| M1 | Medium | Panel cohorts, sessions, announcements | Compare table/tiles with Edit form | Same clock | Tables UTC, forms local (3 h apart in KSA) | Format `A.when` with local time or label as UTC |
| M2 | Medium | RLS `cohort_public_read` + `session_read` | Anonymous `GET /rest/v1/cohorts` | Only what the site shows | Full rows incl. `meeting_url`, `notes` | Narrow policy or expose a view |
| M3 | Medium | Portal certificates | Learner with an expiring certificate | Expiry shown | `getCertificates()` (portal.js:322) omits `valid_until`; view never shows it; revoked (`is_valid=false`) certificates also render with no marker | Select `valid_until,is_valid`; show "Valid until" and "Revoked" |
| M4 | Medium | RLS `enr_trainer_read`, `prof_trainer_read`, `lp_trainer_read` | Trainer owns cohort k of course c where `c.trainer_id` is someone else | Roster loads | Policies key on `courses.trainer_id` only → roster empty for that trainer | Extend `using` with `exists (cohorts k where k.id = e.cohort_id and k.trainer_id = auth.uid())` |
| M5 | Medium | Panel cohort detail → + Add learner → "Enrol a new person" | Pick a company learner, submit | Enrolment carries `org_id` so the company lead sees it | `delivery.js` inserts `{user_id, course_id, cohort_id, assigned_by}` — no `org_id`; invisible to `enr_org_read` | Copy `profile.org_id` into the insert (as the enrolments form does) |
| M6 | Medium | Panel cohort detail, attendance | Change a select | Sessions table "Present" count updates | Value persists (upsert verified: `POST attendance?on_conflict=session_id,user_id`) but the view is not re-rendered — S1 still "0 / 1" after marking a learner late | Call `A.render()` after `loadAll(true)` or patch the cell |
| M7 | Medium | Panel, trainer, `#/announcements` list | Trainer reads the list | Only own-cohort and "everyone" announcements | On the real backend RLS filters correctly; but `A.loadAll` also requests `leads`, `organizations`, `profiles` — `organizations` has no trainer read policy so Company shows "—" everywhere for trainers | Add a narrow org read for trainers/leads or hide the column |
| L1 | Low | Site hero | Contrast of text over the animated canvas | ≥ 4.5:1 | Sampled behind the eyebrow: canvas rgb(56,104,100), under the `.hero::before` overlay ≈ 4.9:1; body copy ≈ 4.6:1 at a lighter point — marginal, and the overlay fades to 0.15 alpha across the column | Keep overlay ≥ 0.6 over the text column |
| L2 | Low | Site course modal | Open any card | `role=dialog` carries `aria-labelledby` | Present on `#courseModal` (`aria-labelledby="cmTitle"`), fine; however focus lands inside and restores to the card — verified; no issue beyond the stale `glass-l` class name on `.verify-box` | Rename the class |
| L3 | Low | Legal pages | Compare with site | Same display type | `h1` on privacy/terms uses IBM Plex (legal.css), site uses Fraunces | Align or accept |
| L4 | Low | Portal sign-in / sign-up | Submit invalid values | Errors announced | `.ferr` messages have no `role`/`aria-live`; inputs lack `aria-describedby` | Add `aria-describedby` + `aria-live="polite"` |
| L5 | Low | Portal set-password (`#/setpassword`) | Arrive from invite link | Confirm field | Single password field, no confirmation; no strength hint | Add confirm or inline rule |
| L6 | Low | Panel cohort → + Add learner → "Enrol a new person" | Open the Person select | Learners only | Lists every profile including staff, trainers and partners | Filter to `learner`/`client_admin` |
| L7 | Low | Panel Edit cohort (trainer) | Open the form | — | Trainer can reassign trainer/company/course in the form (moot once H2 is fixed) | Gate on `canWrite()` |
| L8 | Low | Site contact form | Submit with empty required fields | Inline messages | Native `reportValidity()` bubbles only; the hidden `#formErr` text is pre-rendered in the DOM | Fine functionally; consider inline messages |

## Role matrix (observed on the harness)

| Role | Routes offered | Observed |
|---|---|---|
| super_admin | 16 (dashboard, reports, access, accounts, companies, courses, lessons, enrolments, progress, certificates, cohorts, modules, paths, announcements, leads, database) | All present. Cohorts list → k1 → tiles (Status is plain text, no pill), sessions table (#, Title, Starts, Ends, Present), roster with attendance selects (upsert persists; stale count M6), + Session modal (title, starts*, ends; `aria-labelledby`; focus moves in; Esc closes), + Add learner (modes `enrolled`/`new`, fields swap), Edit cohort (`datetime-local` prefilled — M1), Delete confirm ("…and its sessions and attendance are removed. 1 enrolment(s) stay…"). Modules: list, + New (sort_order pre-filled 30), edit prefilled, delete confirm, create/delete round-trip. Lessons: Module column; form has Module select. Announcements: audience `all`/`org`/`cohort` shows/hides Company / Cohort. Learning paths: course checkboxes, course pills in table. Courses form: "Certificate valid for (months)" with hint. Certificates: Expires column. Reports: 10 definitions in `reports.js`. Database: all 15 tables incl. the 7 new ones. |
| admin | 15 (no access) | `#/access` rewritten to `#/dashboard`. |
| trainer | 7 (courses, lessons, enrolments, progress, cohorts, modules, announcements) | Read-only on shared views; on k1: attendance selects visible and working (`keep-rw`); **+ Session hidden, session Edit/Delete hidden, cohort Edit visible, list Open/Edit hidden** (H2/H3); no Add learner (correct); announcements + New / Edit / Delete hidden (H2); `#/access` → `#/courses`. |
| client_admin | 5 (companies, enrolments, progress, certificates, cohorts) | No edit buttons anywhere; **cohort list Open hidden** (H3); detail read-only; `#/courses` → `#/companies`. |
| learner / partner | 0 | "Nothing to manage here", 0 chips, URL rewritten to `#/`, sign-out shown. |
| `admin.html` (real) | — | Sign-in gate only (email + password, labelled), no chips, no session. |

## RLS vs UI

- `cohorts`: write is `is_staff()` only. UI offers trainer Edit (H2). Anon read of scheduled/running
  cohorts of published courses (M2) — not used by the site; if intended for a future "upcoming runs"
  section, add a column-limited view.
- `cohort_sessions`: anon/authenticated read wherever the cohort is visible; trainer write on own
  cohorts — UI hides it (H2).
- `attendance`: trainer `for all` on own cohorts — UI matches (selects work); learner self-read and
  company-lead read exist but no portal view uses attendance yet (suggestion S4).
- `announcements`: trainer write limited to `audience='cohort'` on own cohorts — form limits the
  audience list and cohort options accordingly (correct) but the buttons are hidden (H2). Read policy
  hides expired rows; panel list for staff shows all (fine, staff policy).
- `course_modules`: read for authenticated only — the public site does not need it; trainer read on
  own courses; write staff only — UI matches (trainer sees no + New module).
- `learning_paths` / `learning_path_courses`: anon read of published — portal fetches with
  `is_published=eq.true` (fine); staff write — UI matches (paths route is staff-only).
- Roster visibility for trainers depends on `courses.trainer_id`, not `cohorts.trainer_id` (M4).
- `recompute_progress()` sets `valid_until` from `courses.valid_for_months` — the panel form writes
  the column (verified) and the Certificates view reads it; the portal does not (M3).

## Design assessment

Honest read: it no longer reads as a generated template in the way round 2 did. The serif
display face, the restrained gold-on-teal hero, plain small-caps section labels (no numbers), the
6 / 10 px radii and the absence of glass panels, gradients and shimmer give it a settled,
editorial feel; the hero "journey" diagram card is the one bespoke element and it earns its place.
What still gives it away: the Trainers section is a labelled empty photo slot with
"Replace this slot with a photograph of a real session" visible to visitors — that caption must
not ship; the hero still carries a `linear-gradient` overlay (`.hero::before`) and one gradient on
the photo placeholder, which is fine but contradicts "no gradients" literally; the contact
details are still the `+966 50 000 0000` / `hello@basera.sa` placeholders from `config.js`; the
`glass-l` class name survives in the markup; and the marquee strip is a stock pattern. In Arabic
the fallback to IBM Plex Sans Arabic 600 for headings is correct and the RTL mirroring of the
buttons' arrows and the journey labels is handled — the overflow bug (H4) is the only thing that
would make it look broken. Legal pages are plain and consistent with each other but use a
different heading face from the site.

## Suggestions (not defects)

- S1 — Bilingual titles for cohorts and sessions: `cohorts.title` and `cohort_sessions.title` are
  single-language while everything else is `_en/_ar`; the portal shows them untranslated.
- S2 — Terminology: the panel says "Cohort", the delivery copy says "runs", the portal kicker uses
  the cohort title or the word "Sessions"; pick "Cohort / Session / Module" everywhere, including
  the Arabic (مجموعة / جلسة / وحدة) and the site FAQ.
- S3 — Show attendance to learners and company leads: policies already allow it; a small
  "Attendance" line on the course page and a column in the panel's Progress view would use it.
- S4 — `getAnnouncements()` is limited to 10 and the dashboard shows 5; add a "see all" or paging.
- S5 — The panel's `.readonly` CSS approach (hide by class) is fragile — the trainer regressions
  above are its direct result; prefer deciding per control in JS (`ownsCohort` already exists).
- S6 — Add a "Revoked" badge and "Valid until" to the public certificate check result too
  (`verify_certificate` RPC does not return `valid_until`).

## Could not be tested

- Authenticated portal journeys (dashboard with real data, lesson playback, quiz, certificate
  download) — no credentials by rule; traced in code instead.
- Scroll-spy highlighting and canvas animation/resizing — renderer frozen in the hidden pane.
- Arabic layout as seen by a user at 375 px (H4) — DOM measurements only; no screenshot.
- Portal language toggle on the auth screens — the click did not switch to Arabic in this run;
  unclear whether the control or the test was at fault, so not reported as a defect.
- Real-backend RLS behaviour — reasoned from the migration SQL, not executed.
- Email delivery of invites and the set-password round trip against Supabase Auth.
