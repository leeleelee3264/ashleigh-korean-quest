-- Ashleigh's Korean Study Quest - Supabase schema (B1: single shared account)
-- Run this in Supabase Dashboard → SQL Editor.
--
-- Model: there is ONE shared Supabase login that both people use. The role
-- (student/checker) is chosen in the app by which button you tap — it is NOT
-- stored per-user. So there is no `profiles` table and no per-row ownership.
-- Security comes from: only that one account can authenticate (you set its
-- password), and RLS below allows ONLY authenticated requests. The public anon
-- key alone (not logged in) can read/write nothing.

-- ── submissions ───────────────────────────────────────────
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  student_id text,                      -- role marker ("ashleigh"), informational only
  week_start date not null,
  lesson_title text not null,
  screenshot_path text not null,
  note text,
  submitted_at timestamptz default now(),

  status text not null default 'pending' check (status in ('pending', 'approved')),
  checker_comment text,
  reviewed_at timestamptz,
  reviewed_by text
);

create index if not exists submissions_week_idx on public.submissions(week_start desc);

alter table public.submissions enable row level security;

-- The shared account (authenticated) can do everything; anon is blocked.
drop policy if exists "authenticated full access" on public.submissions;
create policy "authenticated full access"
  on public.submissions for all
  to authenticated
  using (true)
  with check (true);

-- ── storage bucket for screenshots ────────────────────────
insert into storage.buckets (id, name, public)
values ('screenshots', 'screenshots', false)
on conflict (id) do nothing;

drop policy if exists "authenticated can read screenshots" on storage.objects;
create policy "authenticated can read screenshots"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'screenshots');

drop policy if exists "authenticated can upload screenshots" on storage.objects;
create policy "authenticated can upload screenshots"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'screenshots');

-- ── one-time setup ────────────────────────────────────────
-- 1. Authentication → Users → Add user: create ONE account
--    (e.g. quest@quest.app) and set a password you'll share with Ashleigh.
--    Turn off "Confirm email" if you used a placeholder email.
-- 2. Put that email in src/components/Login.tsx (SHARED_EMAIL).
-- 3. Project Settings → API: copy Project URL + anon key into env vars
--    (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).
