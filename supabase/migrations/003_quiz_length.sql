-- Run after 001 and 002, before deploying configurable quiz lengths.
begin;
alter table public.quiz_sessions
  drop constraint quiz_sessions_total_count_check;
alter table public.quiz_sessions
  add constraint quiz_sessions_total_count_check check (total_count > 0);
-- correct_count must still be between zero and total_count (existing check).
-- No permissions or RLS policies change.
commit;
