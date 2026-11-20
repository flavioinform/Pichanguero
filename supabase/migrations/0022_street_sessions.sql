-- Fútbol callejero online: a 2-player room joined by a 6-char code, same
-- shape as headsoccer_sessions. The match itself never touches the DB (it
-- runs over a Realtime broadcast channel); this table only carries who is in
-- the room, each one's country and the waiting/ready/playing/finished phase.

create table if not exists street_sessions (
  id uuid primary key default gen_random_uuid(),
  join_code text unique not null,
  host_id uuid not null references auth.users(id),
  guest_id uuid references auth.users(id),
  host_country text not null,
  guest_country text,
  status text not null default 'waiting' check (status in ('waiting', 'ready', 'playing', 'finished')),
  created_at timestamptz not null default now()
);

create index if not exists street_sessions_join_code_idx on street_sessions(join_code);

alter table street_sessions enable row level security;

create policy "street sessions readable while waiting or by members"
  on street_sessions for select
  using (status = 'waiting' or host_id = auth.uid() or guest_id = auth.uid());

create policy "host can create a street session"
  on street_sessions for insert
  with check (host_id = auth.uid());

create policy "members can update a street session"
  on street_sessions for update
  using (host_id = auth.uid() or guest_id = auth.uid());

-- The guest claims the open seat with an UPDATE before being a member, so the
-- policy above isn't enough on its own (the bug Head Soccer had, see 0019).
create policy "a player can claim the open seat in a waiting street session"
  on street_sessions for update
  using (status = 'waiting' and guest_id is null)
  with check (guest_id = auth.uid());

alter publication supabase_realtime add table street_sessions;
