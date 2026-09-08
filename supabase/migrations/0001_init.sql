-- Pichanguero menu principal: catalog of games shown in the carousel.
create table if not exists games (
  id text primary key,
  name text not null,
  short_desc text not null,
  how_to_play text not null,
  icon_key text not null check (icon_key in ('grid', 'dice', 'help')),
  bg_image_url text not null,
  is_flagship boolean not null default false,
  sort_order int not null
);

alter table games enable row level security;

create policy "games are publicly readable"
  on games for select
  using (true);

-- Gato futbolero: online turn-based sessions between two players.
-- Not played yet (menu links to the loading placeholder), but the schema
-- is ready so Realtime sync can be wired in once the game is built.
create table if not exists game_sessions (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references games(id),
  player_a uuid not null references auth.users(id),
  player_b uuid references auth.users(id),
  status text not null default 'waiting' check (status in ('waiting', 'active', 'finished')),
  current_turn uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table game_sessions enable row level security;

create policy "players can read their own sessions"
  on game_sessions for select
  using (auth.uid() = player_a or auth.uid() = player_b);

create policy "players can create sessions"
  on game_sessions for insert
  with check (auth.uid() = player_a);

create policy "players can update their own sessions"
  on game_sessions for update
  using (auth.uid() = player_a or auth.uid() = player_b);

-- One row per grid cell answer submitted during a Gato futbolero session.
create table if not exists game_turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references game_sessions(id) on delete cascade,
  player_id uuid not null references auth.users(id),
  row_index int not null,
  col_index int not null,
  answer text not null,
  is_correct boolean,
  created_at timestamptz not null default now()
);

alter table game_turns enable row level security;

create policy "players can read turns of their own sessions"
  on game_turns for select
  using (
    exists (
      select 1 from game_sessions s
      where s.id = game_turns.session_id
        and (auth.uid() = s.player_a or auth.uid() = s.player_b)
    )
  );

create policy "players can insert turns in their own sessions"
  on game_turns for insert
  with check (
    auth.uid() = player_id
    and exists (
      select 1 from game_sessions s
      where s.id = game_turns.session_id
        and (auth.uid() = s.player_a or auth.uid() = s.player_b)
    )
  );

-- Realtime: broadcast changes on game_sessions/game_turns so both players
-- in a session see turns as they happen (subscribe by session_id).
alter publication supabase_realtime add table game_sessions;
alter publication supabase_realtime add table game_turns;
