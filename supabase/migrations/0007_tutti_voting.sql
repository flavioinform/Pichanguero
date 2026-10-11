-- Switches Tutti frutti's scoring from automatic database validation to a
-- group vote among the match's own players: after "Basta" cuts the round,
-- any player can set each answer's verdict (not just their own), which is
-- how the previously-automatic is_valid/points/invalid_reason columns get
-- filled in now. Needed because some categories are explicitly subjective
-- ("Jugador fachero") and can never be checked against a database at all.

alter table tutti_sessions drop constraint if exists tutti_sessions_status_check;
alter table tutti_sessions add constraint tutti_sessions_status_check
  check (status in ('waiting', 'round_active', 'round_grace', 'round_voting', 'round_results', 'finished'));

-- The existing "players can update their own answers" policy only lets you
-- touch your own row, which blocks exactly what voting needs: anyone
-- setting a verdict on anyone else's answer. Added rather than replaced,
-- since Postgres combines permissive policies with OR.
create policy "members can vote on any answer in their session"
  on tutti_answers for update
  using (is_tutti_member(session_id));
