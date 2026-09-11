-- Run after 001, including on existing projects before deploying this version.
-- Existing quizzes were all German -> English.
begin;
alter table public.quiz_sessions
  add column direction text not null default 'de-en'
  check (direction in ('de-en', 'en-de'));
commit;
