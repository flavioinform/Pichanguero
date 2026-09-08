-- Unifies a player's current club and historical transfer destinations
-- into one (player_id, club_id) relation. The "club" grid criterion in
-- Gato futbolero checks this instead of player_club_stints alone, since
-- many players (e.g. long-tenured ones with no recorded transfer, or
-- youth graduates) only show up via current_club_id.
create or replace view player_clubs as
  select id as player_id, current_club_id as club_id
  from players
  where current_club_id is not null
  union
  select player_id, club_id
  from player_club_stints
  where club_id is not null;

grant select on player_clubs to anon, authenticated;
