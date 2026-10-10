# Basera — QA report

> Update 2026-10-10: the career coach has since been removed from the site, the panel and the database; the coach findings below are historical.

Tested 2026-10-10 against the deployed build (local server serving the exact files on
`main` @ `a7f6446`). Public site, learner portal, and the control panel across all six
account types, in English and Arabic, at 375 / 768 / 1280 px.

## Summary

| Severity | Count |
|---|---|
| Blocker | 0 |
| High | 0 |
| Medium | 3 |
| Low | 2 |
| Suggestion | 9 |

**Verdict: ship-ready.** Nothing is broken for a visitor or a learner. Every defect found
is either cosmetic or placeholder content that only the owner can supply. One defect was
found and fixed during this pass.

**Top issues**

1. ~~Forbidden-route redirect left the URL claiming a page the account never opened~~ — **fixed in this pass**.
2. Privacy and Terms are dead links (`href="#"`) — legally visible pages on a commercial site.
3. Contact details are still placeholders (`+966 50 000 0000`, `hello@basera.sa`).
4. Dashboard sample figures (412 learners / 86% / 3.4h) read as real metrics.
5. No course detail page — a visitor cannot read an outline before enrolling.

## Known issues, confirmed

- **career-coach returns 500** (`OPENROUTER_API_KEY` not set - the function was moved to OpenRouter free models on 15 Sep; the earlier Anthropic key is no longer used). The fallback works correctly:
  the UI shows "The coach is unavailable right now. Here are the closest courses…" plus
  keyword-matched recommendations. No stuck spinner, no crash, input clears, Enter works.
- **Migration and `admin-users` are deployed.** `admin-users` returns `401 Not signed in`
  to an anonymous caller; `rpc/is_super` returns `false`; the public course list still
  reads (16 courses).

## Findings

| ID | Sev | Page | Steps | Expected | Actual | Fix |
|---|---|---|---|---|---|---|
| F1 | Medium | panel | As trainer open `#/certificates` | URL reflects the page shown | Rendered Courses correctly, but URL stayed `#/certificates`; a refresh or shared link kept the wrong address | **Fixed** — `current()` now `replaceState`s to the resolved route. Valid routes and their query params are left alone. |
| F2 | Medium | index | Click Privacy / Terms in footer | Open a policy page | `href="#"` — jumps to top | Write both pages, or remove the links until they exist |
| F3 | Medium | index | Read contact section | Real details | `+966 50 000 0000`, `hello@basera.sa` | Replace before promoting the site |
| F4 | Low | index | Platform section | Clearly illustrative | "412 learners / 86% / 3.4h" look like real platform metrics | Label as "Sample report" |
| F5 | Low | sandbox only | Any page | — | `ERR_NAME_NOT_RESOLVED` in console | Test-environment DNS, **not a site defect**. Confirmed by reaching the same endpoints over curl. |

## Verified working

**Public site (EN + AR).** 11 sections, 11 motion canvases, `Motion` loaded. Nav anchors
all resolve, no broken footer anchors, exactly one `h1`, every input labelled, no unlabelled
icon buttons, `aria-live` on results count / chat / certificate result. Search: "power bi"
→ 1, Arabic "تقييم" → 1, nonsense → 0 with the correct empty message; Clear restores 16.
Filter chips work (Leadership → 3). Certificate check: empty → "Enter a certificate code
first", unknown → "No certificate found…". FAQ accordion opens and closes, 6 items. Contact
form requires name / company / email and refuses to submit empty. Enrol buttons point at
`learn.html#/catalogue`.

**Arabic.** `lang=ar`, `dir=rtl`, headline and nav translated, choice persisted to
`localStorage`. No untranslated `data-i18n` nodes. No horizontal overflow in RTL.

**Responsive.** No overflow at any width. 1280: 3-col offers and courses, full nav.
768: burger appears, nav hides, 2-col courses. 375: 1-col, burger opens and closes with
correct `aria-expanded`.

**Portal.** Sign-in renders. Sign-up is grouped (About you / How you sign in / Your company)
with per-field validation — empty → "Enter your full name.", bad email → "Enter a valid
email address.", short password → "Password must be at least 8 characters.", mismatch →
"The two passwords do not match." No account was created at any point. Invite / reset links
land on "Set your password" both as a full page load and as a hash-only change.
Both translation dictionaries are complete at 120 keys each.

**Panel role gating.** Verified per type:

| Type | Pages | Forbidden hash | Data leak |
|---|---|---|---|
| Super admin | 13, incl. Users & access (24-row matrix) | n/a | — |
| Admin | 12, no access | `#/access` → Dashboard | none |
| Trainer | courses, lessons, enrolments, progress | `#/certificates` → Courses | none |
| Company lead | companies, enrolments, progress, certificates | `#/dashboard` → Companies | none |
| Learner | none | — | "Nothing to manage here" + portal link + sign out, 0 chips |
| Partner | none | — | same, no table rendered |

Nav highlight tracked the rendered page correctly even before F1 was fixed. Reports page
lists 10 reports and keeps its `?report=` parameter.

## UI vs RLS

The panel's per-route `roles:[]` is consistently **narrower or equal** to what the SQL
permits — the safe direction. Nothing is offered that RLS would refuse.

- Trainer: SQL grants SELECT on own courses, their enrolments, those learners' progress and
  profiles. UI offers exactly courses / lessons / enrolments / progress, read-only
  (`body.readonly`). Matches.
- Company lead: SQL grants SELECT on own-org profiles, enrolments, progress, certificates,
  and UPDATE of learner/client_admin roles within the org. UI offers companies / enrolments /
  progress / certificates. **Gap, in the safe direction:** RLS lets a company lead move their
  own people between learner and client_admin, but no UI exposes it.
- Learner / partner: no staff policies, no pages. Matches.
- Last-super-admin guard exists in both the DB trigger and the Edge Function.

## Suggestions (not bugs)

1. **Course detail pages** — a visitor cannot see an outline, trainer or dates before enrolling.
2. **Company-lead dashboard** — the role exists and RLS supports it, but there is no "my team" view.
3. **Trainer roster view** — trainers can read their learners' progress; nothing summarises it per cohort.
4. **Certificate PDF** — certificates are verifiable but not downloadable.
5. **Portal catalogue search** — the public site has search; the learner catalogue does not.
6. **Pricing page** — prices exist per course but there is no commercial overview.
7. **Testimonials / case studies** — the site asserts results with no evidence slots.
8. **Email notifications** — enrolment, completion and certificate issue are all silent.
9. **Terminology** — "Company lead" in the UI vs `client_admin` in the database; worth one glossary line in the README.

## Not tested, and why

- **Signed-in learner journeys** (dashboard, enrol, lesson, quiz pass at 70%, certificates,
  account screen) — requires a real account; I create none. Traced in code instead; the
  routes, guards and i18n are present and consistent.
- **Live Supabase calls from the browser** — this sandbox has no DNS, so those paths fail
  here by design. Verified the endpoints over curl instead, and used the failure to confirm
  the client-side fallbacks behave.
- **Real email delivery** for invitations and resets — needs Site URL configured in the
  Supabase dashboard.
- **Actual writes through the panel** — exercised against the mock backend only; no real
  rows were created, changed or deleted.
