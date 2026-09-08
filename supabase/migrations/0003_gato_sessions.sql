-- Extends game_sessions for Gato futbolero: join-by-code matchmaking,
-- a persisted 3x3 grid (so both players see the same criteria), and scores.
alter table game_sessions
  add column if not exists join_code text unique,
  add column if not exists player_a_nickname text,
  add column if not exists player_b_nickname text,
  add column if not exists row_criteria jsonb,
  add column if not exists col_criteria jsonb,
  add column if not exists scores jsonb not null default '{}'::jsonb;

create index if not exists game_sessions_join_code_idx on game_sessions(join_code);

-- Anonymous auth means "authenticated" players are still auth.uid()-backed,
-- just without email/password. Anyone can look up a session by its join
-- code while it's waiting for an opponent (needed before they're player_b),
-- and any signed-in (incl. anonymous) user can claim the open player_b slot.
drop policy if exists "players can read their own sessions" on game_sessions;
create policy "players can read their own or open sessions"
  on game_sessions for select
  using (status = 'waiting' or auth.uid() = player_a or auth.uid() = player_b);

drop policy if exists "players can update their own sessions" on game_sessions;
create policy "players can update their own sessions"
  on game_sessions for update
  using (auth.uid() = player_a or auth.uid() = player_b)
  with check (auth.uid() = player_a or auth.uid() = player_b);

create policy "anyone signed in can join an open session"
  on game_sessions for update
  using (status = 'waiting' and player_b is null)
  with check (player_b = auth.uid());

-- game_turns' existing policies already key off auth.uid() = player_a/player_b
-- on the parent session, which now works the same way for anonymous users.
