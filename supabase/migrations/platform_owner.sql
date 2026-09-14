-- Basera: platform-owner roles, staff policies, trainer access, guards.
-- Apply once, in the Supabase SQL editor (Dashboard -> SQL -> New query -> Run),
-- or let Claude apply it via the connector if you allow the migration call.
-- Idempotent: safe to run twice.

-- ------------------------------------------------------------------
-- Roles: super_admin (platform owner) and trainer join the existing set.
-- ------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('super_admin','admin','trainer','client_admin','learner','partner'));

-- Lead funnel gains a "qualified" stage between contacted and won.
alter table public.leads drop constraint if exists leads_status_check;
alter table public.leads add constraint leads_status_check
  check (status in ('new','contacted','qualified','won','lost'));

-- Trainers are assigned to courses.
alter table public.courses
  add column if not exists trainer_id uuid references public.profiles(id) on delete set null;
create index if not exists courses_trainer_idx on public.courses(trainer_id);

-- ------------------------------------------------------------------
-- Helpers. SECURITY DEFINER so policies on profiles can call them
-- without recursing into their own RLS.
-- ------------------------------------------------------------------
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('admin','super_admin') from public.profiles where id = auth.uid()), false)
$$;
create or replace function public.is_super() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'super_admin' from public.profiles where id = auth.uid()), false)
$$;

-- ------------------------------------------------------------------
-- First account ever created becomes the platform owner.
-- ------------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_role text := 'learner';
begin
  if not exists (select 1 from public.profiles where role in ('admin','super_admin')) then
    v_role := 'super_admin';
  end if;
  if coalesce(new.raw_user_meta_data->>'join_code','') <> '' then
    select id into v_org from public.organizations
      where join_code = upper(new.raw_user_meta_data->>'join_code');
  end if;
  insert into public.profiles (id, email, full_name, role, org_id, department, lang)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
          v_role, v_org,
          nullif(new.raw_user_meta_data->>'department',''),
          coalesce(new.raw_user_meta_data->>'lang','en'));
  return new;
end $$;

-- If admins already existed before this migration, the earliest becomes owner.
update public.profiles set role = 'super_admin'
where role = 'admin'
  and not exists (select 1 from public.profiles where role = 'super_admin')
  and id = (select id from public.profiles where role = 'admin' order by created_at limit 1);

-- ------------------------------------------------------------------
-- Guard: only a super admin may grant or remove admin-level roles,
-- and the last super admin can be neither demoted nor deleted.
-- Skipped when there is no auth.uid() (service role, SQL editor).
-- ------------------------------------------------------------------
create or replace function public.guard_profile_roles() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_actor text;
begin
  if auth.uid() is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  select role into v_actor from public.profiles where id = auth.uid();

  if tg_op = 'UPDATE' and new.role is distinct from old.role then
    if (new.role in ('admin','super_admin') or old.role in ('admin','super_admin'))
       and v_actor is distinct from 'super_admin' then
      raise exception 'Only a super admin can grant or remove admin roles';
    end if;
    if old.role = 'super_admin' and new.role <> 'super_admin'
       and (select count(*) from public.profiles where role = 'super_admin') <= 1 then
      raise exception 'Cannot remove the last super admin';
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.role in ('admin','super_admin') and v_actor is distinct from 'super_admin' then
      raise exception 'Only a super admin can remove an admin account';
    end if;
    if old.role = 'super_admin'
       and (select count(*) from public.profiles where role = 'super_admin') <= 1 then
      raise exception 'Cannot delete the last super admin';
    end if;
    return old;
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard_roles on public.profiles;
create trigger profiles_guard_roles
  before update or delete on public.profiles
  for each row execute function public.guard_profile_roles();

-- ------------------------------------------------------------------
-- Progress recompute now also runs on DELETE, so resetting a
-- learner's progress from the panel rolls the enrolment back.
-- ------------------------------------------------------------------
create or replace function public.recompute_progress() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_eid uuid; v_total int; v_done int; v_pct int; v_score int; e record; c record; v_code text;
begin
  v_eid := case when tg_op = 'DELETE' then old.enrollment_id else new.enrollment_id end;
  select * into e from public.enrollments where id = v_eid;
  if not found then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  select count(*) into v_total from public.lessons where course_id = e.course_id;
  select count(*), round(avg(score)) into v_done, v_score
    from public.lesson_progress where enrollment_id = e.id;
  v_pct := case when v_total = 0 then 0 else least(100, (v_done * 100) / v_total) end;
  update public.enrollments set
    progress_pct = v_pct,
    score = v_score,
    status = case when v_pct = 100 then 'completed' else 'active' end,
    completed_at = case when v_pct = 100 then coalesce(completed_at, now()) else null end
  where id = e.id;
  if v_pct = 100 and not exists (select 1 from public.certificates where enrollment_id = e.id) then
    select * into c from public.courses where id = e.course_id;
    if c.has_certificate then
      v_code := 'BSR-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.cert_seq')::text, 5, '0');
      insert into public.certificates (code, holder_name, course_id, issued_on, user_id, enrollment_id, score)
      select v_code, p.full_name, e.course_id, current_date, e.user_id, e.id, v_score
        from public.profiles p where p.id = e.user_id;
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
drop trigger if exists on_lesson_progress on public.lesson_progress;
create trigger on_lesson_progress
  after insert or update or delete on public.lesson_progress
  for each row execute function public.recompute_progress();

-- ------------------------------------------------------------------
-- Policies: every "admin" policy becomes a "staff" policy
-- (admin + super_admin), and trainers get read access to their own
-- courses, the learners on them, and those learners' progress.
-- ------------------------------------------------------------------
drop policy if exists cert_admin on public.certificates;
drop policy if exists cert_staff on public.certificates;
create policy cert_staff on public.certificates for all to authenticated
  using (is_staff()) with check (is_staff());

drop policy if exists coach_admin on public.coach_logs;
drop policy if exists coach_staff on public.coach_logs;
create policy coach_staff on public.coach_logs for all to authenticated
  using (is_staff()) with check (is_staff());

drop policy if exists course_admin_all on public.courses;
drop policy if exists course_staff on public.courses;
drop policy if exists course_trainer_read on public.courses;
create policy course_staff on public.courses for all to authenticated
  using (is_staff()) with check (is_staff());
create policy course_trainer_read on public.courses for select to authenticated
  using (trainer_id = auth.uid());

drop policy if exists enr_admin_all on public.enrollments;
drop policy if exists enr_staff on public.enrollments;
drop policy if exists enr_trainer_read on public.enrollments;
create policy enr_staff on public.enrollments for all to authenticated
  using (is_staff()) with check (is_staff());
create policy enr_trainer_read on public.enrollments for select to authenticated
  using (exists (select 1 from public.courses c
                 where c.id = enrollments.course_id and c.trainer_id = auth.uid()));

drop policy if exists leads_admin on public.leads;
drop policy if exists leads_staff on public.leads;
create policy leads_staff on public.leads for all to authenticated
  using (is_staff()) with check (is_staff());

drop policy if exists lp_admin on public.lesson_progress;
drop policy if exists lp_staff on public.lesson_progress;
drop policy if exists lp_trainer_read on public.lesson_progress;
create policy lp_staff on public.lesson_progress for all to authenticated
  using (is_staff()) with check (is_staff());
create policy lp_trainer_read on public.lesson_progress for select to authenticated
  using (exists (select 1 from public.enrollments e join public.courses c on c.id = e.course_id
                 where e.id = lesson_progress.enrollment_id and c.trainer_id = auth.uid()));

drop policy if exists lesson_admin_all on public.lessons;
drop policy if exists lesson_staff on public.lessons;
drop policy if exists lesson_read on public.lessons;
create policy lesson_staff on public.lessons for all to authenticated
  using (is_staff()) with check (is_staff());
create policy lesson_read on public.lessons for select to authenticated
  using (exists (select 1 from public.courses c
                 where c.id = lessons.course_id
                   and (c.is_published or c.trainer_id = auth.uid() or is_staff())));

drop policy if exists org_admin_all on public.organizations;
drop policy if exists org_staff on public.organizations;
create policy org_staff on public.organizations for all to authenticated
  using (is_staff()) with check (is_staff());

drop policy if exists prof_admin_all on public.profiles;
drop policy if exists prof_staff on public.profiles;
drop policy if exists prof_trainer_read on public.profiles;
create policy prof_staff on public.profiles for all to authenticated
  using (is_staff()) with check (is_staff());
create policy prof_trainer_read on public.profiles for select to authenticated
  using (exists (select 1 from public.enrollments e join public.courses c on c.id = e.course_id
                 where e.user_id = profiles.id and c.trainer_id = auth.uid()));
