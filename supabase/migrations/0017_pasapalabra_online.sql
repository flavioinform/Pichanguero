-- Online Pasapalabra: a room shares one rosco (same question ids in ring
-- order) and every player plays it against the same clock. Each player's
-- letter-by-letter progress lives on their own row so the others can watch
-- it update. The used-questions table keeps a player from getting the same
-- clue twice across games.

create table if not exists pasapalabra_sessions (
  id uuid primary key default gen_random_uuid(),
  join_code text unique not null,
  host_id uuid not null references auth.users(id),
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'finished')),
  question_ids text[] not null default '{}',
  duration_seconds int not null default 180,
  started_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists pasapalabra_sessions_join_code_idx on pasapalabra_sessions(join_code);

create table if not exists pasapalabra_players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references pasapalabra_sessions(id) on delete cascade,
  player_id uuid not null references auth.users(id),
  nickname text not null,
  statuses text not null default '',
  score int not null default 0,
  finished_at timestamptz,
  joined_at timestamptz not null default now(),
  unique (session_id, player_id)
);

create table if not exists pasapalabra_used (
  player_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  used_at timestamptz not null default now(),
  primary key (player_id, question_id)
);

alter table pasapalabra_sessions enable row level security;
alter table pasapalabra_players enable row level security;
alter table pasapalabra_used enable row level security;

-- Same recursion guard as the other multiplayer tables: the membership check
-- runs as a security-definer function so the policy doesn't query itself.
create or replace function is_pasapalabra_member(p_session_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from pasapalabra_players where session_id = p_session_id and player_id = auth.uid()
  );
$$;

create policy "pasapalabra sessions readable while waiting or by members"
  on pasapalabra_sessions for select
  using (status = 'waiting' or is_pasapalabra_member(id));

create policy "host can create a pasapalabra session"
  on pasapalabra_sessions for insert
  with check (host_id = auth.uid());

create policy "host or member can update a pasapalabra session"
  on pasapalabra_sessions for update
  using (host_id = auth.uid() or is_pasapalabra_member(id));

create policy "members can read the pasapalabra roster"
  on pasapalabra_players for select
  using (is_pasapalabra_member(session_id));

create policy "anyone signed in can join as a pasapalabra player"
  on pasapalabra_players for insert
  with check (player_id = auth.uid());

create policy "players update only their own pasapalabra row"
  on pasapalabra_players for update
  using (player_id = auth.uid());

create policy "players read only their own used questions"
  on pasapalabra_used for select
  using (player_id = auth.uid());

create policy "players record only their own used questions"
  on pasapalabra_used for insert
  with check (player_id = auth.uid());

alter publication supabase_realtime add table pasapalabra_sessions;
alter publication supabase_realtime add table pasapalabra_players;
