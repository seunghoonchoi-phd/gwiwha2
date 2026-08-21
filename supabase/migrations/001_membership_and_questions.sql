-- Supabase schema for the gwiwha membership-protected question bank.
-- Run this in Supabase Dashboard -> SQL Editor before importing questions.

create extension if not exists pgcrypto;

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  note text,
  constraint members_email_normalized check (email = lower(btrim(email)))
);

create table if not exists public.questions (
  id text primary key,
  category text not null,
  type text not null,
  exam text not null default 'nat',
  question_number integer not null,
  content jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists questions_exam_idx on public.questions (exam);
create index if not exists questions_type_idx on public.questions (type);
create index if not exists questions_category_idx on public.questions (category);
create index if not exists questions_exam_type_category_idx on public.questions (exam, type, category);
create index if not exists questions_question_number_idx on public.questions (question_number);

alter table public.members enable row level security;
alter table public.questions enable row level security;

drop policy if exists "members can read own row" on public.members;
create policy "members can read own row"
on public.members
for select
to authenticated
using (email = lower(coalesce(auth.jwt() ->> 'email', '')));

drop policy if exists "active members can read questions" on public.questions;
create policy "active members can read questions"
on public.questions
for select
to authenticated
using (
  exists (
    select 1
    from public.members m
    where m.email = lower(coalesce(auth.jwt() ->> 'email', ''))
      and m.active = true
  )
);

-- No insert/update/delete policies are created for browser users.
-- Manage members in Supabase Dashboard. Import questions with a service-role key
-- or from the Dashboard SQL tools, never from browser JavaScript.
