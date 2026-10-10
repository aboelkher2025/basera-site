-- The round-3 corrections (20261010185602) made courses depend on cohorts
-- while cohorts already depended on courses: Postgres refuses the loop
-- ("infinite recursion detected in policy") and every read failed after a
-- successful sign-in. The trainer checks move into security-definer helpers,
-- which read the tables without re-entering their policies.

create or replace function public.trains_course(cid text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.cohorts k where k.course_id = cid and k.trainer_id = auth.uid())
$$;
create or replace function public.trains_cohort(kid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.cohorts k where k.id = kid and k.trainer_id = auth.uid())
$$;
create or replace function public.trains_user(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.enrollments e join public.cohorts k on k.id = e.cohort_id
                 where e.user_id = uid and k.trainer_id = auth.uid())
$$;
create or replace function public.trains_enrollment(eid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.enrollments e join public.cohorts k on k.id = e.cohort_id
                 where e.id = eid and k.trainer_id = auth.uid())
$$;
create or replace function public.trains_org(oid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.cohorts k where k.org_id = oid and k.trainer_id = auth.uid())
      or exists (select 1 from public.courses c join public.enrollments e on e.course_id = c.id
                 where c.trainer_id = auth.uid() and e.org_id = oid)
$$;
revoke execute on function public.trains_course(text), public.trains_cohort(uuid), public.trains_user(uuid),
  public.trains_enrollment(uuid), public.trains_org(uuid) from public, anon;
grant execute on function public.trains_course(text), public.trains_cohort(uuid), public.trains_user(uuid),
  public.trains_enrollment(uuid), public.trains_org(uuid) to authenticated;

drop policy if exists course_cohort_trainer_read on public.courses;
create policy course_cohort_trainer_read on public.courses for select to authenticated using (public.trains_course(id));

drop policy if exists lesson_cohort_trainer_read on public.lessons;
create policy lesson_cohort_trainer_read on public.lessons for select to authenticated using (public.trains_course(course_id));

drop policy if exists module_cohort_trainer_read on public.course_modules;
create policy module_cohort_trainer_read on public.course_modules for select to authenticated using (public.trains_course(course_id));

drop policy if exists enr_cohort_trainer_read on public.enrollments;
create policy enr_cohort_trainer_read on public.enrollments for select to authenticated using (public.trains_cohort(cohort_id));

drop policy if exists prof_cohort_trainer_read on public.profiles;
create policy prof_cohort_trainer_read on public.profiles for select to authenticated using (public.trains_user(id));

drop policy if exists lp_cohort_trainer_read on public.lesson_progress;
create policy lp_cohort_trainer_read on public.lesson_progress for select to authenticated using (public.trains_enrollment(enrollment_id));

drop policy if exists org_trainer_read on public.organizations;
create policy org_trainer_read on public.organizations for select to authenticated using (public.trains_org(id));
