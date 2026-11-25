-- Replace EVERY occurrence of the sample UUID with your own Auth user UUID.
-- Run once in Supabase SQL Editor, after creating your account.
begin;
create table public.diaries (
 user_id uuid not null references auth.users(id) on delete cascade,
 diary_date date not null,
 memo text not null default '' check (length(memo)<=20000),
 original text not null default '' check (length(original)<=6000),
 sentences jsonb not null default '[]'::jsonb check (jsonb_typeof(sentences)='array' and jsonb_array_length(sentences)<=100),
 updated_at timestamptz not null default clock_timestamp(),
 primary key(user_id,diary_date)
);
alter table public.diaries enable row level security;
revoke all on public.diaries from anon, authenticated;
grant select,insert,update,delete on public.diaries to authenticated;
create policy owner_only on public.diaries for all to authenticated
 using ((select auth.uid())=user_id and user_id='fd383dec-3792-4525-84a7-005828af625c'::uuid)
 with check ((select auth.uid())=user_id and user_id='fd383dec-3792-4525-84a7-005828af625c'::uuid);
create function public.set_diary_updated_at() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=clock_timestamp(); return new; end; $$;
create trigger diary_updated_at before update on public.diaries for each row execute function public.set_diary_updated_at();
commit;
