# What a learning platform is made of — research, gap analysis and roadmap for Basera

Written 10 October 2026. Sources at the end. The first half is the field as it stands; the
second half measures Basera against it and sets the build order.

## 1. The standards

Four interoperability standards matter, and they do different jobs.

| Standard | What it is | What it does for you |
|---|---|---|
| **SCORM** (1.2 / 2004) | A packaging and tracking format for self-paced content inside an LMS. Still the most common format vendors deliver. | Lets you import third-party courses (a zip) and record completion and score. Tracks only inside the LMS. |
| **xAPI** (Experience API, ratified as IEEE 9274.1.1-2023) | A statement format — *actor, verb, object* — stored in a Learning Record Store. Records learning anywhere: an app, a simulator, a classroom sign-off. | The audit trail. Everything a learner does becomes a statement you can report on, including live sessions and on-the-job observations. |
| **cmi5** | An xAPI profile that adds what SCORM had and xAPI lacked: how a course is packaged, launched, and what *completed* and *passed* officially mean. IEEE standardisation in progress (P9274.3.1). | The recommended path for new content in 2026: SCORM's structure with xAPI's reach. |
| **LTI 1.3** | A signed launch handshake that opens an external tool inside an LMS. No tracking of its own. | Embedding a third-party tool (a video platform, a lab, a proctoring service) without copying content. |

AICC is the 1990s ancestor and is only met in legacy content. QTI is the IMS format for
*questions*; Open Badges 3.0 is the portable credential format a certificate can be
exported to.

**What this means for Basera.** You author your own courses, so SCORM import and an LRS
are not day-one needs. Two things are: design the data model so every learner action is
*recordable as a statement* (who, did what, to which object, when, with what result) so an
xAPI export is a view over existing tables rather than a rebuild; and treat each
certificate as a credential with an issuer, a subject, a date and an expiry, so Open Badges
is a format change rather than a feature.

## 2. The structure every LMS shares

```
Programme / Learning path        a sequence of courses with an order and a goal
  Course                         the unit of enrolment and certification
    Module (section, chapter)    a group of lessons with its own heading and order
      Lesson (unit, topic)       one sitting: text, video, document, or an assessment
        Activity                 a thing the learner does inside a lesson: read, watch,
                                 answer, submit, attend
Cohort (class, session, run)     a scheduled delivery of a course: dates, place or link,
                                 trainer, capacity. A learner takes a seat in a cohort.
Enrolment                        the link between a person and a course (or a seat in a
                                 cohort), carrying status, progress and the final score
Gradebook                        learners × items for one course, optionally one cohort
Completion criteria              what "done" means: all activities, a score, a time, a
                                 trainer sign-off, or a combination
```

Three consequences follow from this model that are easy to get wrong:

1. **Modules are not optional.** A course with 48 lessons and no grouping is unreadable.
   Every serious LMS lets an author group lessons, and the learner's course page shows the
   groups as an outline with progress per group.
2. **Delivery is a separate thing from content.** The same course runs as an on-site
   cohort in March and a self-paced track all year. Dates, venue, trainer and attendance
   belong to the *cohort*, not the course.
3. **Completion is a rule, not a boolean.** "Every lesson done" is one rule; "quiz ≥ 70%"
   is another; "attended 2 of 3 sessions and passed the final check" is a third. The rule
   lives on the course and the trigger evaluates it.

## 3. Capabilities, grouped by who needs them

**Learner**
- Catalogue with search, categories, filters; a course page with outline, outcomes, length, format, upcoming cohorts, trainer, price, certificate
- My learning: in progress, upcoming sessions, due dates, completed
- Lesson player: text, video, document, quiz; next/previous; resume where you left off
- Assessments: quiz with pass mark and attempts; assignments with file upload and trainer grading
- Certificates: list, download (PDF), share link, verification code, expiry
- Learning paths: ordered programmes with a visible progress bar across courses
- Notifications: enrolment, session reminder, deadline, certificate issued, certificate expiring
- Profile and account: name, language, password, department, notification preferences

**Trainer / instructor**
- My courses and my cohorts; roster per cohort; attendance marking per session
- Grading queue for assignments; feedback to the learner
- Course outline editing (modules, lessons, quizzes) for the courses they own
- Announcements to a cohort

**Company lead / manager (tenant admin)**
- My team: who is enrolled in what, progress, overdue, completed, certificates expiring
- Assign a course or a path to people or to a department; approve self-enrolment requests
- Team reports and exports; compliance view (who is out of date on what)
- Manage the team's seats: invite, deactivate, move department

**Platform staff (admin / super admin)**
- Everything above across all tenants
- Catalogue management: courses, modules, lessons, quizzes, categories, tags, pricing, publishing
- Cohort scheduling and capacity
- Accounts and roles; tenant (company) management; join codes and invitations
- Certificates: templates, issue, revoke, expiry rules
- Reporting: completion, engagement, assessment results, revenue, compliance; CSV and
  scheduled reports
- Settings: branding per tenant, notification templates, integrations (SSO, HRIS, SCORM
  import, xAPI export, webhooks), audit log

**Cross-cutting**
- Bilingual, RTL-correct, accessible (WCAG 2.2 AA), mobile-first
- Row-level data isolation between tenants
- Audit trail for anything that changes a record a regulator may ask about

## 4. Roles and permissions

The industry pattern is role-based access with least privilege, and in multi-tenant
systems a two-level hierarchy: platform roles (super admin, admin) that see across
tenants, and tenant roles (tenant admin / manager, instructor, learner) scoped to one
organisation. Data isolation between tenants is enforced at the data layer, not in the
front end. Basera already does this correctly: `profiles.role` plus `org_id`, enforced by
RLS and a guard trigger, with the UI only ever narrower than the policy.

## 5. Reporting and compliance

The reports buyers ask for first: completion by course / department / period; overdue and
expiring; assessment results and pass rates; engagement (time, last activity); certificates
issued; cohort attendance; revenue by course. Compliance adds recertification (a course
that must be retaken every N months), reminders before expiry, and an immutable record of
who completed what, when, with what evidence.

## 6. What professional sites look like in 2026, and what reads as generated

The consensus across design writing this year is blunt: polished-generic now reads as
machine-made. The markers are glassmorphism, gradient blobs, glowing pill buttons, every
corner heavily rounded, decorative numbering, stock-perfect imagery, and copy that
promises outcomes without specifics. What reads as human and expensive: a deliberate two-
typeface pairing (often a characterful serif for display with a workhorse sans for text),
one accent colour used sparingly, restrained motion, real photography of real people and
places, visible structure (rules, grids, dense but ordered information), and corners
either square or lightly rounded. Stripe, Linear and the better enterprise-learning sites
(Coursera for Business, LinkedIn Learning) all follow that pattern: the design recedes and
the content carries the page.

## 7. Basera today, measured against sections 2–5

| Capability | State | Gap |
|---|---|---|
| Course → lesson | ✅ courses, lessons with text / quiz | **No modules**: 48 lessons with no grouping |
| Delivery / cohorts | ❌ `format` is a label on the course | No dates, venue, trainer-per-run, capacity, attendance |
| Enrolment, progress, completion | ✅ trigger-computed, certificate on 100% | Completion rule is fixed (all lessons); no attempts limit |
| Assessments | ✅ quiz per lesson, 70% | No assignments / uploads / trainer grading |
| Certificates | ✅ code, verify, revoke | No expiry / recertification, no PDF, no template |
| Learning paths | ❌ | — |
| Notifications | ❌ | No announcements, reminders or emails beyond auth |
| Catalogue | ✅ search, six domains | No categories/tags beyond domain, no course page on the site until this week's modal |
| Learner account | ✅ (restored this week) | No notification preferences |
| Trainer | ✅ role + read policies | No cohort roster, attendance or grading UI |
| Company lead | ✅ role + policies | Panel pages filtered by RLS; no "my team" summary or assignment UI |
| Staff panel | ✅ CRUD on every entity + generic table browser | Cohorts, modules, paths, announcements need dedicated views |
| Reporting | ✅ ten reports, CSV | No compliance / expiring view, no scheduled reports |
| Standards | — | Data model is xAPI-shaped already (actor/verb/object in `lesson_progress`); no import/export |
| Tenancy & security | ✅ RLS, guard trigger, Edge Function for auth admin | Audit log absent |
| Bilingual / RTL / a11y | ✅ | — |

## 8. Roadmap

**Phase 1 — structure and delivery (built now).** Modules; cohorts with dates, venue,
trainer and capacity; attendance per cohort session; announcements; learning paths;
certificate expiry. Dedicated panel views for each; the portal course page becomes an
outline; the learner dashboard shows upcoming sessions and announcements. Full add / edit /
delete for staff on all of it, with trainers able to mark attendance on their own cohorts.

**Phase 2 — assessment and evidence.** Assignments with file upload (Supabase Storage) and
trainer grading; attempts and completion rules per course; certificate PDF; audit log table
fed by triggers.

**Phase 3 — the manager.** "My team" for company leads: assign courses and paths to people
or departments, approvals, compliance and expiry view, team exports. Email notifications
through an Edge Function and a transactional mail provider.

**Phase 4 — ecosystem.** SCORM import, xAPI statement export, Open Badges export, SSO,
HRIS user sync, per-tenant branding.

## 9. Design direction for the redesign (applied now)

- **Type:** a display serif (Fraunces) for English headings, IBM Plex Sans Arabic for
  everything else and for Arabic headings. Two faces, paired on purpose.
- **Colour:** petrol as the single structural colour, saffron used only for the primary
  action, ink for text. No gradient surfaces, no glass, no glow.
- **Shape:** 6px radius on controls, 10px on cards, square on tables. Hairline rules
  instead of shadows for structure; one soft shadow reserved for overlays.
- **Motion:** the generated backgrounds stay only behind the hero and the closing call to
  action, at a third of their previous intensity; everything else is static. Reveal
  animations become a single 300ms fade.
- **Imagery:** photo slots with honest captions, ready for real pictures of real sessions;
  no stock, no illustration.
- **Copy:** specific over superlative. Numbers that are real or clearly labelled as samples.

## Sources

- [SCORM vs xAPI vs LTI and cmi5 — AnyforSoft](https://anyforsoft.com/blog/xapi-vs-scorm/)
- [SCORM vs xAPI vs cmi5 vs LTI: which standard, when — Forasoft](https://www.forasoft.com/learn/elearning-video/articles-elearning/scorm-vs-xapi-vs-cmi5-vs-lti)
- [A comparison of e-learning standards — Softdecc](https://www.softdecc.com/en/knowledge-base/a-comparison-of-e-learning-standards/)
- [The ABCs of e-learning standards — ATD](https://www.td.org/content/td-magazine/the-abcs-of-e-learning-standards)
- [cmi5 and SCORM comparison — ADL / AICC](https://aicc.github.io/CMI-5_Spec_Current/SCORM/)
- [Definitions and hierarchy of modules, lessons and activities — Udemy Business](https://business-support.udemy.com/hc/en-us/articles/13292139859991-Definitions-and-hierarchy-of-modules-lessons-and-activities-Leadership-Academy)
- [LMS modules explained — Appsembler](https://appsembler.com/glossary/lms-modules/)
- [Understanding course structure — LMS Portals](https://lmsportals.zendesk.com/hc/en-us/articles/39792363877268-Understanding-Course-Structure-in-LMS-Portals)
- [LMS completion criteria — eLeaP](https://www.eleapsoftware.com/glossary/lms-completion-criteria-define-measure-and-optimize-success/)
- [A glossary of LMS terms — Zoho Learn](https://www.zoho.com/learn/lms-glossary.html)
- [LMS features checklist 2026 — Vector Solutions](https://www.vectorsolutions.com/resources/blogs/learning-management-system-features/)
- [Compliance training LMS features — Disprz](https://disprz.ai/blog/compliance-training-lms-ultimate-guide)
- [Choosing a corporate LMS — Moodle](https://moodle.com/news/corporate-lms-guide/)
- [Corporate LMS: the complete 2026 guide — eLeaP](https://www.eleapsoftware.com/corporate-learning-management-systems/)
- [Managing user roles and permissions in your LMS — eLearning Industry](https://elearningindustry.com/best-practices-for-managing-user-roles-and-permissions-in-your-lms)
- [LMS administration and governance — Learning Systems Authority](https://learningsystemsauthority.com/lms-administration-and-governance/)
- [Best practices for multi-tenant LMS user management — LMS Portals](https://www.lmsportals.com/post/best-practices-for-multi-tenant-lms-enterprise-user-management)
- [AI-slop web design: spotting and fixing generic websites — 925 Studios](https://www.925studios.co/blog/ai-slop-web-design-guide)
- [How to avoid AI-slop typography — Bruvora](https://www.bruvora.com/blog/stop-ai-slop-typography)
- [Did the 2026 web design trend predictions come true — Graphic Design Junction](https://graphicdesignjunction.com/2026/08/did-the-2026-web-design-trends-predictions-come-true/)
- [What makes a website look professional in 2026 — Fernside Studio](https://fernsidestudio.com/blog/what-makes-a-website-look-professional/)
