-- Adds coach data to clubs (needed for the "Entrenador" category) and the
-- schema for Tutti frutti futbolero: 2-4 player online rooms, round-based,
-- classic "Basta" ending, categories auto-validated against real data.

alter table clubs add column if not exists coach_name text;

create table if not exists tutti_sessions (
  id uuid primary key default gen_random_uuid(),
  join_code text unique not null,
  host_id uuid not null references auth.users(id),
  max_players int not null default 4 check (max_players between 2 and 4),
  status text not null default 'waiting'
    check (status in ('waiting', 'round_active', 'round_grace', 'round_results', 'finished')),
  category_keys text[] not null,
  rounds_total int not null default 5,
  current_round int not null default 0,
  current_letter text,
  basta_player_id uuid references auth.users(id),
  basta_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists tutti_sessions_join_code_idx on tutti_sessions(join_code);

create table if not exists tutti_players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references tutti_sessions(id) on delete cascade,
  player_id uuid not null references auth.users(id),
  nickname text not null,
  total_score int not null default 0,
  joined_at timestamptz not null default now(),
  unique (session_id, player_id)
);

create table if not exists tutti_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references tutti_sessions(id) on delete cascade,
  round int not null,
  player_id uuid not null references auth.users(id),
  category_key text not null,
  answer text not null default '',
  is_valid boolean,
  points int,
  created_at timestamptz not null default now(),
  unique (session_id, round, player_id, category_key)
);

alter table tutti_sessions enable row level security;
alter table tutti_players enable row level security;
alter table tutti_answers enable row level security;

-- Sessions: visible while waiting for players (so a join code can be looked
-- up before you're a member) or if you're already a member.
create policy "tutti sessions readable while waiting or by members"
  on tutti_sessions for select
  using (
    status = 'waiting'
    or exists (select 1 from tutti_players p where p.session_id = tutti_sessions.id and p.player_id = auth.uid())
  );

create policy "host can create a tutti session"
  on tutti_sessions for insert
  with check (host_id = auth.uid());

create policy "host or a member can update a tutti session"
  on tutti_sessions for update
  using (
    host_id = auth.uid()
    or exists (select 1 from tutti_players p where p.session_id = tutti_sessions.id and p.player_id = auth.uid())
  );

-- Players: visible to anyone who is themselves a member of that session
-- (so the lobby/scoreboard can list everyone). This can't be a plain
-- `exists (select 1 from tutti_players ...)` subquery in the policy itself
-- — Postgres would apply the same policy recursively to that subquery and
-- fail with "infinite recursion detected in policy". A security-definer
-- function sidesteps that by running its internal check with RLS bypassed.
create or replace function is_tutti_member(p_session_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from tutti_players where session_id = p_session_id and player_id = auth.uid()
  );
$$;

create policy "members can read the player roster"
  on tutti_players for select
  using (is_tutti_member(session_id));

create policy "anyone signed in can join as a player row"
  on tutti_players for insert
  with check (player_id = auth.uid());

create policy "a player can update only their own row"
  on tutti_players for update
  using (player_id = auth.uid());

-- Answers: only visible to members of that session, and everyone can only
-- write their own answers.
create policy "members can read answers in their session"
  on tutti_answers for select
  using (
    exists (select 1 from tutti_players p where p.session_id = tutti_answers.session_id and p.player_id = auth.uid())
  );

create policy "players can write their own answers"
  on tutti_answers for insert
  with check (player_id = auth.uid());

create policy "players can update their own answers"
  on tutti_answers for update
  using (player_id = auth.uid());

alter publication supabase_realtime add table tutti_sessions;
alter publication supabase_realtime add table tutti_players;
alter publication supabase_realtime add table tutti_answers;
