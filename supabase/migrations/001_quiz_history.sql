-- Run once on a new Supabase project through SQL Editor.
begin;
create table public.quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null,
  completed_at timestamptz not null,
  correct_count integer not null check (correct_count >= 0 and correct_count <= total_count),
  total_count integer not null check (total_count = 10),
  duration_seconds integer not null check (duration_seconds >= 0),
  created_at timestamptz default now(),
  unique (id, user_id),
  check (completed_at >= started_at)
);
create table public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.quiz_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  vocabulary_id text not null check (length(vocabulary_id) between 1 and 100),
  user_answer text check (length(user_answer) <= 500),
  correct boolean not null,
  answered_at timestamptz default now(),
  foreign key (session_id, user_id) references public.quiz_sessions(id, user_id) on delete cascade,
  unique (session_id, vocabulary_id)
);
create index quiz_sessions_user_completed_idx on public.quiz_sessions (user_id, completed_at desc);
create index quiz_answers_user_idx on public.quiz_answers (user_id);
-- The unique (session_id, vocabulary_id) index also supports session_id lookups.
alter table public.quiz_sessions enable row level security;
alter table public.quiz_answers enable row level security;
revoke all on table public.quiz_sessions, public.quiz_answers from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select, insert on table public.quiz_sessions, public.quiz_answers to authenticated;
create policy sessions_select_own on public.quiz_sessions for select to authenticated using ((select auth.uid()) = user_id);
create policy sessions_insert_own on public.quiz_sessions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy answers_select_own on public.quiz_answers for select to authenticated using ((select auth.uid()) = user_id);
create policy answers_insert_own on public.quiz_answers for insert to authenticated with check (
  (select auth.uid()) = user_id and exists (
    select 1 from public.quiz_sessions s where s.id = session_id and s.user_id = (select auth.uid())
  )
);
commit;
