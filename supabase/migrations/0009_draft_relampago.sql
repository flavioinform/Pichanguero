-- Draft relámpago: 2-player online squad draft. Each turn the system
-- offers 4 real players (filtered by the slot's required position, never
-- someone already drafted by either team) and the active player picks one.
-- 5 slots per team (GK, DEF, MID, FWD, FWD), 10 picks total, strictly
-- alternating turns. Winner = higher total international_caps across the
-- squad — a real, comparable stat already in the imported data.

create table if not exists draft_sessions (
  id uuid primary key default gen_random_uuid(),
  join_code text unique not null,
  host_id uuid not null references auth.users(id),
  status text not null default 'waiting' check (status in ('waiting', 'drafting', 'finished')),
  turn_player_id uuid references auth.users(id),
  pick_number int not null default 0,
  offered_player_ids bigint[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists draft_sessions_join_code_idx on draft_sessions(join_code);

create table if not exists draft_players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references draft_sessions(id) on delete cascade,
  player_id uuid not null references auth.users(id),
  nickname text not null,
  joined_at timestamptz not null default now(),
  unique (session_id, player_id)
);

create table if not exists draft_picks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references draft_sessions(id) on delete cascade,
  player_id uuid not null references auth.users(id),
  slot_index int not null,
  picked_player_id bigint not null references players(id),
  created_at timestamptz not null default now(),
  unique (session_id, player_id, slot_index)
);

alter table draft_sessions enable row level security;
alter table draft_players enable row level security;
alter table draft_picks enable row level security;

-- Same recursion pitfall as tutti_players: a draft_players SELECT policy
-- can't reference draft_players in its own USING clause, so this
-- security-definer function runs that check with RLS bypassed instead.
create or replace function is_draft_member(p_session_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from draft_players where session_id = p_session_id and player_id = auth.uid()
  );
$$;

create policy "draft sessions readable while waiting or by members"
  on draft_sessions for select
  using (status = 'waiting' or is_draft_member(id));

create policy "host can create a draft session"
  on draft_sessions for insert
  with check (host_id = auth.uid());

create policy "members can update a draft session"
  on draft_sessions for update
  using (host_id = auth.uid() or is_draft_member(id));

create policy "members can read the draft roster"
  on draft_players for select
  using (is_draft_member(session_id));

create policy "anyone signed in can join as a draft player row"
  on draft_players for insert
  with check (player_id = auth.uid());

create policy "members can read picks in their session"
  on draft_picks for select
  using (is_draft_member(session_id));

create policy "players can insert their own picks"
  on draft_picks for insert
  with check (player_id = auth.uid());

alter publication supabase_realtime add table draft_sessions;
alter publication supabase_realtime add table draft_players;
alter publication supabase_realtime add table draft_picks;
