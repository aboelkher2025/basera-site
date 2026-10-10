-- Corrections from the round-3 QA of phase 1.

-- M2: anonymous callers may see that a run exists and when, never the meeting link,
-- the notes or who leads it. Column-level grant replaces the table-wide one.
revoke select on public.cohorts from anon;
grant select (id, course_id, title, format, starts_at, ends_at, location, capacity, status, created_at) on public.cohorts to anon;

-- M4: a trainer who leads a cohort of a course they do not "own" must still see its
-- roster, progress, course and lessons. Keyed on cohorts.trainer_id.
create policy enr_cohort_trainer_read on public.enrollments for select to authenticated
  using (exists (select 1 from public.cohorts k where k.id = enrollments.cohort_id and k.trainer_id = auth.uid()));
create policy prof_cohort_trainer_read on public.profiles for select to authenticated
  using (exists (select 1 from public.enrollments e join public.cohorts k on k.id = e.cohort_id
                 where e.user_id = profiles.id and k.trainer_id = auth.uid()));
create policy lp_cohort_trainer_read on public.lesson_progress for select to authenticated
  using (exists (select 1 from public.enrollments e join public.cohorts k on k.id = e.cohort_id
                 where e.id = lesson_progress.enrollment_id and k.trainer_id = auth.uid()));
create policy course_cohort_trainer_read on public.courses for select to authenticated
  using (exists (select 1 from public.cohorts k where k.course_id = courses.id and k.trainer_id = auth.uid()));
create policy lesson_cohort_trainer_read on public.lessons for select to authenticated
  using (exists (select 1 from public.cohorts k where k.course_id = lessons.course_id and k.trainer_id = auth.uid()));
create policy module_cohort_trainer_read on public.course_modules for select to authenticated
  using (exists (select 1 from public.cohorts k where k.course_id = course_modules.course_id and k.trainer_id = auth.uid()));

-- M7: trainers read the companies they deliver to, so names resolve in their views.
create policy org_trainer_read on public.organizations for select to authenticated
  using (exists (select 1 from public.cohorts k where k.org_id = organizations.id and k.trainer_id = auth.uid())
      or exists (select 1 from public.courses c join public.enrollments e on e.course_id = c.id
                 where c.trainer_id = auth.uid() and e.org_id = organizations.id));