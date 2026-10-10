-- Courses catalogue (public read)
create table public.courses (
  id text primary key,
  domain text not null check (domain in ('hr','lead','sales','data','auto','fin')),
  level text not null check (level in ('b','i','a')),
  format text not null check (format in ('live','self','site')),
  hours int not null,
  price_sar int not null,
  has_certificate boolean not null default true,
  title_en text not null,
  title_ar text not null,
  summary_en text not null,
  summary_ar text not null,
  keywords text not null default '',
  is_published boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz not null default now()
);

-- Certificates (public lookup by code only)
create table public.certificates (
  code text primary key,
  holder_name text not null,
  course_id text not null references public.courses(id),
  issued_on date not null,
  is_valid boolean not null default true,
  created_at timestamptz not null default now()
);

-- Leads from the contact form (public insert only)
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  email text not null,
  interest text,
  message text,
  source text default 'website',
  created_at timestamptz not null default now()
);

-- Coach conversations (written by the edge function only)
create table public.coach_logs (
  id uuid primary key default gen_random_uuid(),
  user_message text not null,
  reply text,
  course_ids text[],
  lang text,
  created_at timestamptz not null default now()
);

alter table public.courses enable row level security;
alter table public.certificates enable row level security;
alter table public.leads enable row level security;
alter table public.coach_logs enable row level security;

create policy "public read published courses" on public.courses
  for select to anon, authenticated using (is_published);

create policy "public lookup certificates" on public.certificates
  for select to anon, authenticated using (true);

create policy "public insert leads" on public.leads
  for insert to anon, authenticated with check (true);

-- certificate lookup as a function so the table is never listed, only queried by exact code
create or replace function public.verify_certificate(p_code text)
returns table(holder_name text, course_title_en text, course_title_ar text, issued_on date, is_valid boolean)
language sql stable security definer set search_path = public as $$
  select c.holder_name, k.title_en, k.title_ar, c.issued_on, c.is_valid
  from public.certificates c join public.courses k on k.id = c.course_id
  where upper(c.code) = upper(trim(p_code));
$$;
grant execute on function public.verify_certificate(text) to anon, authenticated;

-- lock down direct select on certificates: only via the function
drop policy "public lookup certificates" on public.certificates;
