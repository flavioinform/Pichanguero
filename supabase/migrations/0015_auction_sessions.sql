-- Subasta futbolera, online mode. Each round one mystery player (a "lot")
-- goes up for auction: everyone bids from a shared starting budget, highest
-- bid wins and pays it. The score of a won lot is that player's real
-- international_caps, so reading the clues well beats just spending big.
--
-- The host is the authority for the round clock: it stamps round_started_at,
-- closes bidding once the window is over, writes the round result and moves
-- on to the next round. Guests only insert their own bids.

create table if not exists auction_sessions (
  id uuid primary key default gen_random_uuid(),
  join_code text unique not null,
  host_id uuid not null references auth.users(id),
  status text not null default 'waiting' check (status in ('waiting', 'bidding', 'reveal', 'finished')),
  budget int not null check (budget between 10 and 1000),
  rounds_total int not null check (rounds_total between 3 and 15),
  max_players int not null default 4 check (max_players between 2 and 4),
  current_round int not null default 0,
  lot_player_ids bigint[] not null default '{}',
  round_started_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists auction_sessions_join_code_idx on auction_sessions(join_code);

create table if not exists auction_players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references auction_sessions(id) on delete cascade,
  player_id uuid not null references auth.users(id),
  nickname text not null,
  budget_left int not null,
  score int not null default 0,
  joined_at timestamptz not null default now(),
  unique (session_id, player_id)
);

create table if not exists auction_bids (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references auction_sessions(id) on delete cascade,
  round int not null,
  player_id uuid not null references auth.users(id),
  amount int not null check (amount >= 1),
  created_at timestamptz not null default now()
);

create index if not exists auction_bids_session_round_idx on auction_bids(session_id, round);

create table if not exists auction_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references auction_sessions(id) on delete cascade,
  round int not null,
  lot_player_id bigint not null references players(id),
  winner_id uuid references auth.users(id),
  price int not null default 0,
  caps int not null default 0,
  created_at timestamptz not null default now(),
  unique (session_id, round)
);

alter table auction_sessions enable row level security;
alter table auction_players enable row level security;
alter table auction_bids enable row level security;
alter table auction_results enable row level security;

-- Membership/host checks go through security-definer helpers so the
-- policies on auction_players don't recurse into themselves (same pitfall as
-- tutti_players / draft_players).
create or replace function is_auction_member(p_session_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from auction_players where session_id = p_session_id and player_id = auth.uid()
  );
$$;

create or replace function is_auction_host(p_session_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from auction_sessions where id = p_session_id and host_id = auth.uid()
  );
$$;

create policy "auction sessions readable while waiting or by members"
  on auction_sessions for select
  using (status = 'waiting' or is_auction_member(id));

create policy "host can create an auction session"
  on auction_sessions for insert
  with check (host_id = auth.uid());

create policy "only the host updates an auction session"
  on auction_sessions for update
  using (host_id = auth.uid());

create policy "members can read the auction roster"
  on auction_players for select
  using (is_auction_member(session_id));

create policy "anyone signed in can join as an auction player"
  on auction_players for insert
  with check (player_id = auth.uid());

-- The host writes every player's budget/score when it closes a round.
create policy "host can update auction players"
  on auction_players for update
  using (is_auction_host(session_id));

create policy "members can read bids in their session"
  on auction_bids for select
  using (is_auction_member(session_id));

create policy "members can place their own bids"
  on auction_bids for insert
  with check (player_id = auth.uid() and is_auction_member(session_id));

create policy "members can read round results"
  on auction_results for select
  using (is_auction_member(session_id));

create policy "host can write round results"
  on auction_results for insert
  with check (is_auction_host(session_id));

alter publication supabase_realtime add table auction_sessions;
alter publication supabase_realtime add table auction_players;
alter publication supabase_realtime add table auction_bids;
alter publication supabase_realtime add table auction_results;
