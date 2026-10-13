-- Online Pasapalabra becomes a turn-based duel: one player is active at a
-- time, and the turn passes to the next player when the active one says
-- "pasapalabra", misses, runs out of time or finishes their rosco.
--
-- Every player has their own time bank that only runs on their own turns.
-- The turn logic lives in security-definer functions, so a client can't end
-- someone else's turn or give itself extra time: it can only call the RPCs,
-- and the server checks whose turn it is and measures the elapsed time itself.

alter table pasapalabra_sessions add column if not exists turn_player_id uuid references auth.users(id);
alter table pasapalabra_sessions add column if not exists turn_started_at timestamptz;

-- time_left_ms is set for real when the host starts the match (pasapalabra_start)
alter table pasapalabra_players add column if not exists time_left_ms int not null default 180000;
-- the letter this player will be asked next when their turn comes back
alter table pasapalabra_players add column if not exists current_index int not null default 0;

-- Hands the turn to the next player who still has time and letters left,
-- going around in join order. Ends the match when nobody is left.
create or replace function _pasapalabra_advance(p_session_id uuid, p_from uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next uuid;
  v_from_joined timestamptz;
begin
  select joined_at into v_from_joined
  from pasapalabra_players where session_id = p_session_id and player_id = p_from;

  -- players who joined after p_from come first, then the ones before (wrap-around)
  select player_id into v_next
  from pasapalabra_players
  where session_id = p_session_id and finished_at is null and player_id <> p_from
  order by (joined_at > v_from_joined) desc, joined_at
  limit 1;

  if v_next is null then
    if exists (
      select 1 from pasapalabra_players
      where session_id = p_session_id and player_id = p_from and finished_at is null
    ) then
      v_next := p_from; -- the only one still playing keeps the turn
    else
      update pasapalabra_sessions
      set status = 'finished', turn_player_id = null, turn_started_at = null
      where id = p_session_id;
      return;
    end if;
  end if;

  update pasapalabra_sessions
  set turn_player_id = v_next, turn_started_at = now()
  where id = p_session_id;
end;
$$;

revoke all on function _pasapalabra_advance(uuid, uuid) from public;

-- Host starts the match: stores the shared rosco, resets everyone's bank and
-- gives the first turn to whoever joined first (the host).
create or replace function pasapalabra_start(p_session_id uuid, p_question_ids text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s pasapalabra_sessions%rowtype;
  v_first uuid;
begin
  select * into s from pasapalabra_sessions where id = p_session_id for update;
  if not found then raise exception 'No encontramos la sala.'; end if;
  if s.host_id <> auth.uid() then raise exception 'Solo el anfitrión puede empezar.'; end if;
  if s.status <> 'waiting' then raise exception 'La sala ya no está esperando.'; end if;

  select player_id into v_first
  from pasapalabra_players where session_id = p_session_id order by joined_at limit 1;

  update pasapalabra_players
  set time_left_ms = s.duration_seconds * 1000, statuses = '', score = 0, current_index = 0, finished_at = null
  where session_id = p_session_id;

  update pasapalabra_sessions
  set status = 'playing', question_ids = p_question_ids, started_at = now(),
      turn_player_id = v_first, turn_started_at = now()
  where id = p_session_id;
end;
$$;

-- The active player ends their turn (passed, missed, finished or timed out).
-- Charges them the time this turn took, saves their rosco and moves on.
create or replace function pasapalabra_end_turn(
  p_session_id uuid,
  p_statuses text,
  p_score int,
  p_index int,
  p_finished boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s pasapalabra_sessions%rowtype;
  v_elapsed int;
begin
  select * into s from pasapalabra_sessions where id = p_session_id for update;
  if not found or s.status <> 'playing' then raise exception 'La partida no está en curso.'; end if;
  if s.turn_player_id is distinct from auth.uid() then raise exception 'No es tu turno.'; end if;

  v_elapsed := greatest(0, floor(extract(epoch from (now() - s.turn_started_at)) * 1000)::int);

  -- in an UPDATE, time_left_ms on the right-hand side is the value before it
  update pasapalabra_players
  set time_left_ms = greatest(0, time_left_ms - v_elapsed),
      statuses = p_statuses,
      score = p_score,
      current_index = greatest(0, p_index),
      finished_at = case when p_finished or time_left_ms - v_elapsed <= 0 then now() else null end
  where session_id = p_session_id and player_id = auth.uid();

  perform _pasapalabra_advance(p_session_id, auth.uid());
end;
$$;

-- Anyone in the room can close a turn whose time ran out, so a player who
-- closed the tab or lost connection can't freeze the match for everybody.
create or replace function pasapalabra_expire_turn(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s pasapalabra_sessions%rowtype;
  v_left int;
  v_elapsed int;
begin
  if not is_pasapalabra_member(p_session_id) then raise exception 'No sos parte de esta sala.'; end if;

  select * into s from pasapalabra_sessions where id = p_session_id for update;
  if not found or s.status <> 'playing' or s.turn_player_id is null then return; end if;

  select time_left_ms into v_left
  from pasapalabra_players where session_id = p_session_id and player_id = s.turn_player_id;
  v_elapsed := floor(extract(epoch from (now() - s.turn_started_at)) * 1000)::int;
  if v_elapsed < v_left then return; end if;

  update pasapalabra_players
  set time_left_ms = 0, finished_at = now()
  where session_id = p_session_id and player_id = s.turn_player_id;

  perform _pasapalabra_advance(p_session_id, s.turn_player_id);
end;
$$;

grant execute on function pasapalabra_start(uuid, text[]) to authenticated;
grant execute on function pasapalabra_end_turn(uuid, text, int, int, boolean) to authenticated;
grant execute on function pasapalabra_expire_turn(uuid) to authenticated;
