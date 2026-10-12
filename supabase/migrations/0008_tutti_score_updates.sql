-- finalizeTuttiVoting (the host closing the vote) needs to write every
-- player's total_score for the round, not just its own — but the existing
-- "a player can update only their own row" policy on tutti_players blocks
-- exactly that: the host's update to another player's row silently fails
-- RLS (no error surfaces, the row just doesn't change), which is why all
-- the round's points were landing only on the host's own total. Same fix
-- as migration 0007 applied to tutti_answers: add rather than replace,
-- since Postgres combines permissive policies with OR.
create policy "members can update scores in their session"
  on tutti_players for update
  using (is_tutti_member(session_id));
