-- Subasta futbolera: bigger player pools (30 / 40 on offer) and a
-- "solo silueta" option that hides the written clues.
alter table auction_sessions drop constraint if exists auction_sessions_lots_mode_check;
alter table auction_sessions add constraint auction_sessions_lots_mode_check
  check (lots_mode in ('full', 'short', 'big', 'max'));

alter table auction_sessions add column if not exists hide_clues boolean not null default false;
