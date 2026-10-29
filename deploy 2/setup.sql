-- الصق هذا مرة واحدة في Supabase > SQL Editor ثم Run
create table if not exists public.athar_kv (
  path text primary key,
  val jsonb,
  updated_at timestamptz default now()
);
alter table public.athar_kv enable row level security;
drop policy if exists "athar open" on public.athar_kv;
create policy "athar open" on public.athar_kv for all to anon, authenticated using (true) with check (true);
alter publication supabase_realtime add table public.athar_kv;
