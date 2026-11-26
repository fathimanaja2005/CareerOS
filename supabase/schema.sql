-- CareerOS: tables for signed-in users. Run this once in the Supabase SQL editor.
-- Only scores and the job tracker are stored. Resumes and AI reports are never saved.

create table if not exists public.scores (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null,
  label text not null,
  score integer not null,
  at bigint not null
);

create table if not exists public.applications (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  company text not null,
  role text not null,
  url text not null default '',
  status text not null,
  notes text not null default '',
  added_at bigint not null,
  updated_at bigint not null default 0
);

alter table public.scores enable row level security;
alter table public.applications enable row level security;

-- Each person can only see and change their own rows.
drop policy if exists "own scores" on public.scores;
create policy "own scores" on public.scores
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own applications" on public.applications;
create policy "own applications" on public.applications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Let signed-in users reach their own rows through the API. Row level security above
-- still limits every person to rows where user_id matches their own account.
-- Anonymous visitors get no access to these tables.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.scores to authenticated;
grant select, insert, update, delete on public.applications to authenticated;
