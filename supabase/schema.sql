-- Ashley's Korean Quest - Supabase schema
-- Run this in Supabase Dashboard → SQL Editor.

-- ── profiles ──────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('student', 'checker')),
  avatar_emoji text default '🐰',
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles readable by signed-in users" on public.profiles;
create policy "profiles readable by signed-in users"
  on public.profiles for select
  to authenticated using (true);

-- ── submissions ───────────────────────────────────────────
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null,
  lesson_title text not null,
  lesson_url text,
  screenshot_path text not null,
  note text,
  submitted_at timestamptz default now(),

  status text not null default 'pending' check (status in ('pending', 'approved', 'needs_redo')),
  stamp text,
  checker_comment text,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id)
);

create index if not exists submissions_week_idx on public.submissions(week_start desc);
create index if not exists submissions_student_idx on public.submissions(student_id);

alter table public.submissions enable row level security;

drop policy if exists "any signed-in user can read submissions" on public.submissions;
create policy "any signed-in user can read submissions"
  on public.submissions for select
  to authenticated using (true);

drop policy if exists "student inserts own submission" on public.submissions;
create policy "student inserts own submission"
  on public.submissions for insert
  to authenticated
  with check (
    auth.uid() = student_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'student')
  );

drop policy if exists "student can edit own pending submission" on public.submissions;
create policy "student can edit own pending submission"
  on public.submissions for update
  to authenticated
  using (auth.uid() = student_id and status = 'pending')
  with check (auth.uid() = student_id);

drop policy if exists "checker can review" on public.submissions;
create policy "checker can review"
  on public.submissions for update
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'checker'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'checker'));

-- ── storage bucket for screenshots ────────────────────────
insert into storage.buckets (id, name, public)
values ('screenshots', 'screenshots', false)
on conflict (id) do nothing;

drop policy if exists "signed-in users can read screenshots" on storage.objects;
create policy "signed-in users can read screenshots"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'screenshots');

drop policy if exists "students can upload screenshots" on storage.objects;
create policy "students can upload screenshots"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'screenshots'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'student')
  );

-- ── helper: monday of a date ──────────────────────────────
create or replace function public.week_start_of(d date)
returns date language sql immutable as $$
  select (d - ((extract(isodow from d)::int - 1)) * interval '1 day')::date;
$$;

-- ── seed your two accounts (edit values then run this block) ──
-- After you create the two users in Authentication → Users,
-- copy each user's UUID from the dashboard and run:
--
-- insert into public.profiles (id, display_name, role, avatar_emoji)
-- values
--   ('<ASHLEY_UUID>', 'Ashley', 'student', '🦊'),
--   ('<SUNGMIN_UUID>', 'Sungmin', 'checker', '🐻');
