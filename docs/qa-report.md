# Basera — QA report

> **Fixed on 2026-10-10 (round 2):** M1 the contact form now reports a failed send and keeps
> what was typed; M2 a view that began before a session expired can no longer paint over the
> sign-in form; M3 a network failure during a certificate check says "could not check right
> now" instead of "no certificate found". Lows: search inputs labelled; course modal restores
> focus and traps Tab; panel column sort is keyboard-operable with `aria-sort`; panel dialogs
> carry `aria-labelledby`; anchors land below the fixed header; the no-access gate rewrites
> the address; the panel's titles-language button says what it does; the internal "review by
> counsel" note is off the public legal pages (it stays in the README). Still open by design:
> placeholder contact details in `js/config.js`.


Tested 2026-10-10 against the local server (`http://localhost:8099`, same files as deployed).
Covered: public site (EN + AR, 375 / 768 / 1280 px), legal pages, learner portal (unauthenticated
journeys + code trace), real `admin.html` gate, and the control panel on the mock backend
(`tests/panel-harness.html`) for all six account types. Nothing was fixed in this pass.

## Summary

| Severity | Count |
|---|---|
| Blocker | 0 |
| High | 0 |
| Medium | 3 |
| Low | 8 |
| Suggestion | 4 |

**Verdict: ship-able for visitors; two Medium defects should be fixed before the next release.**
No visitor-facing journey is broken. The two issues that matter are silent failure modes:
the contact form tells the visitor "thanks" even when the lead was never stored, and a learner
whose session has expired is left on an empty "My learning" page instead of the sign-in form.
Both are a few lines each. Everything else is accessibility polish, placeholder content, or
panel ergonomics.

Compared with the previous report: F1 (forbidden-route URL rewrite) stays fixed, F2 (dead
Privacy/Terms links) is fixed — both pages exist and are bilingual, F4 (sample figures) now
carries a "Sample report" tag. F3 (placeholder phone/email in `js/config.js`) is still open
and is a known TODO.

## Top issues

1. **M1 — Contact form reports success on failure.** `site.js` swallows the POST error
   (`.catch(()=>{})`) and shows the "thanks" banner in `finally`. A lead that never reached
   the database looks sent. Lost sales enquiries with no trace.
2. **M2 — Expired portal session leaves the learner stuck.** When a REST call returns 401
   and the token refresh fails, the session is cleared and the hash set to `#/signin`, but the
   dashboard view keeps rendering with the anon key and overwrites the sign-in form. Result:
   "My learning — 0 / 0 / 0 — You are not enrolled yet" with no nav and no way in until a reload.
   Reproduced deterministically with a stale token in `basera_session`.
3. **M3 — Certificate check masks errors as "No certificate found".** Any fetch error (network,
   5xx, RPC missing) produces the same message as a genuinely unknown code. A holder checking
   from a bad connection is told their certificate does not exist.
4. **L1 — Course search box is unlabelled** (placeholder only; same for the panel report filter).
5. **Placeholder contact details** are still live in `js/config.js` (known TODO).

## Known / environment notes

- **No DNS in this sandbox**: `ERR_NAME_NOT_RESOLVED` for `*.supabase.co` on most loads. This is
  the test environment, not a defect. During the stale-session reproduction the host did
  resolve for a moment (401 from REST, 400 from token refresh were seen), which is what produced
  the exact production failure path for M2. Fallbacks otherwise degrade cleanly: certificate
  check shows "not found" (see M3), no spinner gets stuck, no uncaught exceptions in any page.
- **Harness-only**: the panel's "Portal" / "Site" links and the "Go to the learning portal"
  button are relative (`learn.html`, `index.html`), so inside `/tests/` they 404. On the real
  `admin.html` they resolve correctly. Not a product bug.
- **Placeholder content**: `contactEmail: hello@basera.sa`, `contactPhone: +966 50 000 0000`
  are rendered into the site footer/contact section and both legal pages.
- Previous report's F1 fix verified: trainer at `#/certificates` renders Courses and the URL
  becomes `#/courses`; admin at `#/access` becomes `#/dashboard`.

## Findings

| ID | Sev | Page | Steps | Expected | Actual | Fix |
|---|---|---|---|---|---|---|
| M1 | Medium | index — contact | Fill name/company/email, submit while the API is unreachable (traced in `site.js` 243-250; not submitted here) | A clear error ("could not send, email us at …") and the form keeps its values | `sb.post("leads").catch(()=>{}).finally(show formOk; f.reset())` — success banner and cleared form regardless of outcome | Show the error branch on `catch`, keep field values, only `reset()` on success |
| M2 | Medium | learn.html | Put a stale/invalid session in `localStorage.basera_session`, open `learn.html#/dashboard` | Sign-in form | Hash flips to `#/signin`, session is cleared, but the dashboard still renders ("My learning", 0/0/0, "Browse the catalogue"); nav hidden; sign-in form never appears until reload | In `render()`, after `getProfile().catch()` re-check `signedIn()` and return `viewAuth("signin")`; or let the "signed out" error propagate instead of swallowing it |
| M3 | Medium | index — verify | Enter any code while the RPC fails | A distinct "could not check right now, try again" message | `checkCert` catch branch shows `v_no` ("No certificate found with that code…") | Add a `v_err` string for the catch branch |
| L1 | Low | index — courses; panel reports | Inspect `#courseSearch`; panel "Filter rows…" input | `<label>` or `aria-label` | Placeholder only; `labels.length === 0`, no `aria-label` | Add `aria-label` (the portal's `#catSearch` already does this) |
| L2 | Low | index — course modal | Open a card with Enter, close with Escape or the X | Focus returns to the card that opened it; Tab stays inside the dialog | Focus lands on `<body>` (`closeCourse` does not restore it); no focus trap | Remember `document.activeElement` on open and refocus on close; trap Tab or use `<dialog>` |
| L3 | Low | panel — any table | Sort by clicking a column header with the keyboard | Headers are buttons with `aria-sort` | Plain `<th>` with a click handler: no `tabindex`, no `role`, no `aria-sort` | Wrap header text in a `<button>` and set `aria-sort` on the `<th>` |
| L4 | Low | panel — any modal | Open "+ New account", "Insert row", etc. | Dialog has an accessible name | `role="dialog" aria-modal="true"` but no `aria-labelledby`/`aria-label` | Give the `<h2>` an id and reference it |
| L5 | Low | panel — language button | Click "عربي" on Database / Accounts | UI switches to Arabic (or the button is labelled as a content-language switch) | Only bilingual data fields (`title_ar` etc.) change; chrome, labels and `dir` stay English/LTR, so on most pages nothing visibly happens; stored under `basera_admin_lang`, separate from the site's `basera_lang` | Either localise the panel chrome or relabel the control ("Content: AR") |
| L6 | Low | privacy.html, terms.html | Read the last paragraph (EN and AR) | Customer-facing copy only | "…should be reviewed by legal counsel before the site is used commercially" is visible to visitors | Remove once counsel has reviewed, or move to a code comment |
| L7 | Low | index — nav anchors | Click a nav link at 1280 px | Section top sits below the 74 px fixed header | Sections have `scroll-margin-top: 0`; the section's top edge lands under the header (headings stay visible only because of section padding) | `section[id]{scroll-margin-top:80px}` |
| L8 | Low | panel — learner / partner | Open `?role=learner#/accounts` | Forbidden hash is rewritten like it is for staff roles | "Nothing to manage here" renders, but the URL keeps `#/accounts` / `#/database` | Call the same `replaceState` from `viewNoAccess` |

## Suggestions (not defects)

- S1 Portal set-password screen (invite/recovery) asks for the password once; the account
  screen's change-password asks twice. Add a confirm field to the invite flow (typo risk on first
  sign-in).
- S2 Quiz pass mark is 70 %, but fixtures have 1-, 2- and 3-question quizzes, where 70 % means
  100 %. Either show "all answers must be correct" for short quizzes or set a minimum question count.
- S3 Panel "+ New account" on the Users & access page navigates to `#/accounts` without opening
  the modal; opening it directly on arrival would save a click.
- S4 Learner/partner "Nothing to manage here" screen makes one REST call (own profile) and no
  data calls — good; consider also hiding the language button there, as it does nothing.

## Role matrix (observed on the harness)

| Role | Nav pages | Chips | Forbidden hash → rendered / URL | REST data calls |
|---|---|---|---|---|
| super_admin | 12: dashboard, reports, access, accounts, companies, courses, lessons, enrolments, progress, certificates, leads, database | Accounts 9, Companies 3, Courses 3, Lessons 5, Enrolments 5, Progress 8, Certificates 3, Leads 3 | n/a (all allowed) | all tables |
| admin | 11 (no access) | same 8 chips | `#/access` → Dashboard, URL `#/dashboard` | all tables |
| trainer | 4: courses, lessons, enrolments, progress | Courses 3, Lessons 5, Enrolments 5, Progress 8 | `#/certificates` → Courses, URL `#/courses` | catalogue + learning |
| client_admin ("Company lead") | 4: companies, enrolments, progress, certificates | Companies 3, Enrolments 5, Progress 8, Certificates 3 | `#/dashboard` → Companies, URL `#/companies` | companies + learning |
| learner | 0 — "Nothing to manage here", portal link, Sign out | 0 | `#/accounts` → gate, URL unchanged (L8) | 1 (own profile) |
| partner | 0 — same gate | 0 | `#/database` → gate, URL unchanged (L8) | 1 (own profile) |

Users & access matrix (super_admin only): 12 rows x 6 role columns, built from the same route
table — matches the nav behaviour above. Sign out on every role clears `basera_session` and
shows the sign-in gate. Real `admin.html#/accounts` with no session: gate only, two labelled
inputs (`autocomplete` username / current-password), 0 nav pages, 0 tables, link to the portal.

## Verified working

**Site (EN + AR).** All 10 section ids present; every `href="#…"` resolves; one `h1`; skip link
(hidden until focus in both directions); 10 motion canvases; no icon button without a name.
Language: toggle sets `lang`/`dir`, persists in `basera_lang`, survives reload, no untranslated
`data-i18n` strings in AR. Search: "power bi" → 1, nonsense → "No matching courses. Try another
word." with live count "0 courses"; chips re-render with `aria-pressed` (Leadership → 3); Clear
restores 16 and refocuses the box. Modal: click and Enter open it, focus moves to Close,
`aria-modal`, `aria-labelledby=cmTitle`, body scroll locked (`modal-open`), Escape closes.
Certificate check: empty → "Enter a certificate code first.", unknown → "No certificate found…",
button never stuck. FAQ: 6 items toggle `aria-expanded`. Contact form: `novalidate` with manual
required check on name/company/email, bad email fails `checkValidity`, nothing submitted.
Burger toggles `aria-expanded` true/false; drawer mirrors in RTL. Active-section highlight
follows scroll correctly at 1280 (offers/courses/platform/contact). Back-to-top present with
`aria-label`. No horizontal scroll at 375 / 768 / 1280 in EN or AR (`scrollX` stays 0; the
partner strip overflows inside `overflow-x:hidden`). Console: only DNS errors.

**Legal pages.** Both bilingual via `data-l`, toggle writes `basera_lang` and the site picks it
up (and vice versa); contact email injected from config; Back-to-site and cross links real.

**Portal (unauthenticated).** Sign-in and sign-up render with labelled inputs and correct
`autocomplete`. Sign-up validation with zero network calls: empty → focus to name; bad email,
8-char minimum, mismatch → focus to the failing field (`.ferr` messages). Invite link
`?x=1#access_token=…&type=invite` → "Set your password", token stripped from the URL, session
stored (removed after the test). Sign-out button is inside the hidden signed-in chrome.

**Portal (traced in `portal.js`, could not sign in).** Catalogue search is a client-side
substring match over title/summary/keywords/domain in both languages (`#catSearch` has
`aria-label`). Lesson quiz: `PASS_MARK = 70`, score rounded, pass → `lesson_progress` upsert
(`merge-duplicates`) then re-render; fail → "Retry". Certificates view reads the holder's rows
ordered by `issued_on desc`. Control-panel link shown only when signed in **and** profile role
is in `PANEL_ROLES = [super_admin, admin, trainer, client_admin]`; the panel re-checks.

**Panel (mock).** Reports: 10 reports defined, Learner activity renders 9 rows, header click
sorts asc then desc, filter "omar" → 1 row, "Export CSV" button wired (`wireCsv`, not clicked:
it triggers a download). Accounts "+ New account": 7 labelled fields, focus on first field,
empty submit → two "Required" errors and the modal stays open, Escape and Cancel close it, row
count unchanged. Database: 8 tables listed, `profiles` shows rows 1–9, Prev/Next disabled on a
single page, Insert and Edit open a JSON-row modal with the right title and Cancel closes.

## Not tested, and why

- Signed-in portal journeys (catalogue enrol, lesson, quiz, certificates, account) — no
  credentials may be used; covered by code trace only.
- Contact form submission and CSV download clicks — forbidden / would download a file.
- Real Supabase responses (certificate RPC, lead insert, auth) — no DNS in the sandbox.
- `admin.html` beyond the gate — real backend; only the harness was exercised.
- Live region announcements and screen-reader output — DOM attributes were checked instead.
