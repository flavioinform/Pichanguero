-- Head Soccer online mode: a 2-player room joined by a 6-char code, same
-- idea as draft_sessions but far lighter — the match itself never touches
-- the DB (inputs sync over a Realtime broadcast channel, not writes), so
-- this table only needs to carry matchmaking state: who's in the room,
-- which country each picked, and the waiting/ready/playing/finished phase.

create table if not exists headsoccer_sessions (
  id uuid primary key default gen_random_uuid(),
  join_code text unique not null,
  host_id uuid not null references auth.users(id),
  guest_id uuid references auth.users(id),
  host_country text not null,
  guest_country text,
  status text not null default 'waiting' check (status in ('waiting', 'ready', 'playing', 'finished')),
  created_at timestamptz not null default now()
);

create index if not exists headsoccer_sessions_join_code_idx on headsoccer_sessions(join_code);

alter table headsoccer_sessions enable row level security;

-- Membership here is just two direct columns (no roster table), so unlike
-- draft_players there's no self-referential recursion risk and a plain
-- predicate works without a security-definer helper.
create policy "headsoccer sessions readable while waiting or by members"
  on headsoccer_sessions for select
  using (status = 'waiting' or host_id = auth.uid() or guest_id = auth.uid());

create policy "host can create a headsoccer session"
  on headsoccer_sessions for insert
  with check (host_id = auth.uid());

create policy "members can update a headsoccer session"
  on headsoccer_sessions for update
  using (host_id = auth.uid() or guest_id = auth.uid());

alter publication supabase_realtime add table headsoccer_sessions;
