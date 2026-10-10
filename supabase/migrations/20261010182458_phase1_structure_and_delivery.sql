-- Phase 1: course structure and delivery.
-- Modules group lessons; cohorts are scheduled runs of a course with sessions and
-- attendance; announcements reach everyone, a company or a cohort; learning paths
-- order courses into programmes; certificates can expire for recertification.

-- ---------- modules ----------
create table if not exists public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.courses(id) on delete cascade,
  title_en text not null,
  title_ar text not null,
  sort_order int not null default 100
);
alter table public.lessons add column if not exists module_id uuid references public.course_modules(id) on delete set null;
create index if not exists lessons_module_idx on public.lessons(module_id);

-- ---------- cohorts, sessions, attendance ----------
create table if not exists public.cohorts (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.courses(id) on delete cascade,
  title text,
  format text not null default 'live' check (format in ('live','site','self')),
  starts_at timestamptz,
  ends_at timestamptz,
  location text,
  meeting_url text,
  trainer_id uuid references public.profiles(id) on delete set null,
  org_id uuid references public.organizations(id) on delete set null,
  capacity int,
  status text not null default 'scheduled' check (status in ('draft','scheduled','running','completed','cancelled')),
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists cohorts_course_idx on public.cohorts(course_id);
create index if not exists cohorts_trainer_idx on public.cohorts(trainer_id);
alter table public.enrollments add column if not exists cohort_id uuid references public.cohorts(id) on delete set null;
create index if not exists enrollments_cohort_idx on public.enrollments(cohort_id);

create table if not exists public.cohort_sessions (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  title text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  sort_order int not null default 100
);
create index if not exists cohort_sessions_cohort_idx on public.cohort_sessions(cohort_id);

create table if not exists public.attendance (
  session_id uuid not null references public.cohort_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'present' check (status in ('present','absent','late','excused')),
  marked_by uuid references public.profiles(id) on delete set null,
  marked_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

-- ---------- announcements ----------
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title_en text not null,
  title_ar text not null,
  body_en text,
  body_ar text,
  audience text not null default 'all' check (audience in ('all','org','cohort')),
  org_id uuid references public.organizations(id) on delete cascade,
  cohort_id uuid references public.cohorts(id) on delete cascade,
  published_at timestamptz not null default now(),
  expires_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null
);

-- ---------- learning paths ----------
create table if not exists public.learning_paths (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  title_en text not null,
  title_ar text not null,
  summary_en text,
  summary_ar text,
  is_published boolean not null default false,
  sort_order int not null default 100,
  created_at timestamptz not null default now()
);
create table if not exists public.learning_path_courses (
  path_id uuid not null references public.learning_paths(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade,
  sort_order int not null default 100,
  primary key (path_id, course_id)
);

-- ---------- recertification ----------
alter table public.courses add column if not exists valid_for_months int;
alter table public.certificates add column if not exists valid_until date;

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
    progress_pct = v_pct, score = v_score,
    status = case when v_pct = 100 then 'completed' else 'active' end,
    completed_at = case when v_pct = 100 then coalesce(completed_at, now()) else null end
  where id = e.id;
  if v_pct = 100 and not exists (select 1 from public.certificates where enrollment_id = e.id) then
    select * into c from public.courses where id = e.course_id;
    if c.has_certificate then
      v_code := 'BSR-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.cert_seq')::text, 5, '0');
      insert into public.certificates (code, holder_name, course_id, issued_on, user_id, enrollment_id, score, valid_until)
      select v_code, p.full_name, e.course_id, current_date, e.user_id, e.id, v_score,
             case when c.valid_for_months is not null then (current_date + (c.valid_for_months || ' months')::interval)::date end
        from public.profiles p where p.id = e.user_id;
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

-- ---------- row-level security ----------
alter table public.course_modules enable row level security;
alter table public.cohorts enable row level security;
alter table public.cohort_sessions enable row level security;
alter table public.attendance enable row level security;
alter table public.announcements enable row level security;
alter table public.learning_paths enable row level security;
alter table public.learning_path_courses enable row level security;

-- modules: read like lessons; staff write
create policy module_read on public.course_modules for select to authenticated
  using (exists (select 1 from public.courses c where c.id = course_modules.course_id
                 and (c.is_published or c.trainer_id = auth.uid() or is_staff())));
create policy module_staff on public.course_modules for all to authenticated using (is_staff()) with check (is_staff());

-- cohorts: anyone can see scheduled runs of published courses (the site lists them);
-- trainers see their own; company leads their company's; staff everything
create policy cohort_public_read on public.cohorts for select to anon, authenticated
  using (status in ('scheduled','running') and exists (select 1 from public.courses c where c.id = cohorts.course_id and c.is_published));
create policy cohort_trainer_read on public.cohorts for select to authenticated using (trainer_id = auth.uid());
create policy cohort_org_read on public.cohorts for select to authenticated using (my_role() = 'client_admin' and org_id = my_org());
create policy cohort_member_read on public.cohorts for select to authenticated
  using (exists (select 1 from public.enrollments e where e.cohort_id = cohorts.id and e.user_id = auth.uid()));
create policy cohort_staff on public.cohorts for all to authenticated using (is_staff()) with check (is_staff());

-- sessions: visible wherever the cohort is; trainers manage sessions of their cohorts
create policy session_read on public.cohort_sessions for select to anon, authenticated
  using (exists (select 1 from public.cohorts k where k.id = cohort_sessions.cohort_id));
create policy session_trainer_write on public.cohort_sessions for all to authenticated
  using (exists (select 1 from public.cohorts k where k.id = cohort_sessions.cohort_id and k.trainer_id = auth.uid()))
  with check (exists (select 1 from public.cohorts k where k.id = cohort_sessions.cohort_id and k.trainer_id = auth.uid()));
create policy session_staff on public.cohort_sessions for all to authenticated using (is_staff()) with check (is_staff());

-- attendance: learner sees own; company lead sees their people; trainer marks their cohorts; staff all
create policy att_self_read on public.attendance for select to authenticated using (user_id = auth.uid());
create policy att_org_read on public.attendance for select to authenticated
  using (my_role() = 'client_admin' and exists (select 1 from public.profiles p where p.id = attendance.user_id and p.org_id = my_org()));
create policy att_trainer_write on public.attendance for all to authenticated
  using (exists (select 1 from public.cohort_sessions s join public.cohorts k on k.id = s.cohort_id where s.id = attendance.session_id and k.trainer_id = auth.uid()))
  with check (exists (select 1 from public.cohort_sessions s join public.cohorts k on k.id = s.cohort_id where s.id = attendance.session_id and k.trainer_id = auth.uid()));
create policy att_staff on public.attendance for all to authenticated using (is_staff()) with check (is_staff());

-- announcements: everyone signed in reads what is addressed to them; trainers post to their cohorts; staff all
create policy ann_read on public.announcements for select to authenticated
  using ((expires_at is null or expires_at > now()) and (
         audience = 'all'
      or (audience = 'org' and org_id = my_org())
      or (audience = 'cohort' and exists (select 1 from public.enrollments e where e.cohort_id = announcements.cohort_id and e.user_id = auth.uid()))
      or (audience = 'cohort' and exists (select 1 from public.cohorts k where k.id = announcements.cohort_id and k.trainer_id = auth.uid()))));
create policy ann_trainer_write on public.announcements for all to authenticated
  using (audience = 'cohort' and exists (select 1 from public.cohorts k where k.id = announcements.cohort_id and k.trainer_id = auth.uid()))
  with check (audience = 'cohort' and exists (select 1 from public.cohorts k where k.id = announcements.cohort_id and k.trainer_id = auth.uid()));
create policy ann_staff on public.announcements for all to authenticated using (is_staff()) with check (is_staff());

-- learning paths: published ones are public; staff write
create policy path_public_read on public.learning_paths for select to anon, authenticated using (is_published or is_staff());
create policy path_staff on public.learning_paths for all to authenticated using (is_staff()) with check (is_staff());
create policy path_course_read on public.learning_path_courses for select to anon, authenticated
  using (exists (select 1 from public.learning_paths p where p.id = learning_path_courses.path_id and (p.is_published or is_staff())));
create policy path_course_staff on public.learning_path_courses for all to authenticated using (is_staff()) with check (is_staff());
