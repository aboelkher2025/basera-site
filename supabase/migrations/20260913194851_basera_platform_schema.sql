-- ===== Organizations =====
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'client' check (type in ('platform','client','partner')),
  join_code text unique default upper(substr(md5(random()::text),1,6)),
  created_at timestamptz not null default now()
);

-- ===== Profiles (1:1 with auth.users) =====
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'learner' check (role in ('admin','client_admin','learner','partner')),
  org_id uuid references public.organizations(id) on delete set null,
  department text,
  lang text not null default 'en',
  created_at timestamptz not null default now()
);

-- first user becomes admin, others learners; optional join code -> org
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_role text := 'learner';
begin
  if not exists (select 1 from public.profiles where role = 'admin') then v_role := 'admin'; end if;
  if coalesce(new.raw_user_meta_data->>'join_code','') <> '' then
    select id into v_org from public.organizations where join_code = upper(new.raw_user_meta_data->>'join_code');
  end if;
  insert into public.profiles (id, email, full_name, role, org_id, department, lang)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), v_role, v_org,
          nullif(new.raw_user_meta_data->>'department',''), coalesce(new.raw_user_meta_data->>'lang','en'));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- helpers (security definer so RLS policies don't recurse)
create or replace function public.my_role() returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() $$;
create or replace function public.my_org() returns uuid language sql stable security definer set search_path = public as $$
  select org_id from public.profiles where id = auth.uid() $$;

-- ===== Curriculum =====
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.courses(id) on delete cascade,
  title_en text not null, title_ar text not null,
  kind text not null default 'text' check (kind in ('text','video','pdf','quiz')),
  body_en text, body_ar text,
  media_url text,
  duration_min int not null default 15,
  quiz jsonb,               -- [{q_en,q_ar,options_en[],options_ar[],answer}]
  sort_order int not null default 100
);

-- ===== Enrollments & progress =====
create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete set null,
  status text not null default 'active' check (status in ('active','completed')),
  progress_pct int not null default 0,
  score int,
  assigned_by uuid references public.profiles(id),
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, course_id)
);
create table public.lesson_progress (
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  score int,
  completed_at timestamptz not null default now(),
  primary key (enrollment_id, lesson_id)
);

-- certificates get owner links
alter table public.certificates
  add column user_id uuid references public.profiles(id) on delete set null,
  add column enrollment_id uuid references public.enrollments(id) on delete set null,
  add column score int;
create sequence public.cert_seq start 418;

-- recompute progress after each lesson completion; issue certificate on 100%
create or replace function public.recompute_progress()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_total int; v_done int; v_pct int; v_score int; e record; c record; v_code text;
begin
  select * into e from public.enrollments where id = new.enrollment_id;
  select count(*) into v_total from public.lessons where course_id = e.course_id;
  select count(*), round(avg(score)) into v_done, v_score from public.lesson_progress where enrollment_id = e.id;
  v_pct := case when v_total = 0 then 0 else least(100, (v_done * 100) / v_total) end;
  update public.enrollments set progress_pct = v_pct, score = v_score,
    status = case when v_pct = 100 then 'completed' else 'active' end,
    completed_at = case when v_pct = 100 then coalesce(completed_at, now()) else null end
  where id = e.id;
  if v_pct = 100 and not exists (select 1 from public.certificates where enrollment_id = e.id) then
    select * into c from public.courses where id = e.course_id;
    if c.has_certificate then
      v_code := 'BSR-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.cert_seq')::text, 5, '0');
      insert into public.certificates (code, holder_name, course_id, issued_on, user_id, enrollment_id, score)
      select v_code, p.full_name, e.course_id, current_date, e.user_id, e.id, v_score from public.profiles p where p.id = e.user_id;
    end if;
  end if;
  return new;
end $$;
create trigger on_lesson_progress after insert or update on public.lesson_progress
  for each row execute function public.recompute_progress();

-- leads get a status for the admin panel
alter table public.leads add column status text not null default 'new' check (status in ('new','contacted','won','lost'));

-- ===== RLS =====
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.lessons enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;

-- organizations
create policy org_admin_all on public.organizations for all to authenticated using (public.my_role()='admin') with check (public.my_role()='admin');
create policy org_member_read on public.organizations for select to authenticated using (id = public.my_org());

-- profiles
create policy prof_self_read on public.profiles for select to authenticated using (id = auth.uid());
create policy prof_self_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and role = public.my_role() and org_id is not distinct from public.my_org());
create policy prof_admin_all on public.profiles for all to authenticated using (public.my_role()='admin') with check (public.my_role()='admin');
create policy prof_org_read on public.profiles for select to authenticated using (public.my_role()='client_admin' and org_id = public.my_org());
create policy prof_org_update on public.profiles for update to authenticated using (public.my_role()='client_admin' and org_id = public.my_org() and role in ('learner','client_admin')) with check (org_id = public.my_org() and role in ('learner','client_admin'));

-- courses: admin write
create policy course_admin_all on public.courses for all to authenticated using (public.my_role()='admin') with check (public.my_role()='admin');

-- lessons: any signed-in user can read lessons of published courses; admin write
create policy lesson_read on public.lessons for select to authenticated using (exists (select 1 from public.courses c where c.id = course_id and (c.is_published or public.my_role()='admin')));
create policy lesson_admin_all on public.lessons for all to authenticated using (public.my_role()='admin') with check (public.my_role()='admin');

-- enrollments
create policy enr_self_read on public.enrollments for select to authenticated using (user_id = auth.uid());
create policy enr_self_insert on public.enrollments for insert to authenticated with check (user_id = auth.uid());
create policy enr_admin_all on public.enrollments for all to authenticated using (public.my_role()='admin') with check (public.my_role()='admin');
create policy enr_org_read on public.enrollments for select to authenticated using (public.my_role()='client_admin' and org_id = public.my_org());
create policy enr_org_insert on public.enrollments for insert to authenticated with check (public.my_role()='client_admin' and org_id = public.my_org());
create policy enr_org_delete on public.enrollments for delete to authenticated using (public.my_role()='client_admin' and org_id = public.my_org());

-- lesson progress
create policy lp_self on public.lesson_progress for all to authenticated using (exists (select 1 from public.enrollments e where e.id = enrollment_id and e.user_id = auth.uid())) with check (exists (select 1 from public.enrollments e where e.id = enrollment_id and e.user_id = auth.uid()));
create policy lp_admin on public.lesson_progress for select to authenticated using (public.my_role()='admin');
create policy lp_org on public.lesson_progress for select to authenticated using (public.my_role()='client_admin' and exists (select 1 from public.enrollments e where e.id = enrollment_id and e.org_id = public.my_org()));

-- certificates: owner / org / admin (public verification still via RPC only)
create policy cert_self on public.certificates for select to authenticated using (user_id = auth.uid());
create policy cert_admin on public.certificates for all to authenticated using (public.my_role()='admin') with check (public.my_role()='admin');
create policy cert_org on public.certificates for select to authenticated using (public.my_role()='client_admin' and exists (select 1 from public.enrollments e where e.id = enrollment_id and e.org_id = public.my_org()));

-- leads & coach logs: admin
create policy leads_admin on public.leads for all to authenticated using (public.my_role()='admin') with check (public.my_role()='admin');
create policy coach_admin on public.coach_logs for select to authenticated using (public.my_role()='admin');

-- default enrollment org = user's org
create or replace function public.set_enrollment_org() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.org_id is null then select org_id into new.org_id from public.profiles where id = new.user_id; end if;
  return new;
end $$;
create trigger enr_set_org before insert on public.enrollments for each row execute function public.set_enrollment_org();

-- platform org
insert into public.organizations (name, type, join_code) values ('Basera', 'platform', 'BASERA');
