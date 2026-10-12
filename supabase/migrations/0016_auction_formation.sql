-- Subasta futbolera now builds a full XI: the room picks a formation and how
-- long the match is. The host only knows how many lots to draw once the
-- players are in, so rounds_total starts at 0 and is set when the auction
-- starts (a full XI per player means 11 x players lots, up to 44).
alter table auction_sessions add column if not exists formation text not null default '4-3-3';
alter table auction_sessions drop constraint if exists auction_sessions_formation_check;
alter table auction_sessions add constraint auction_sessions_formation_check
  check (formation in ('4-3-3', '4-4-2', '3-5-2', '4-2-3-1'));

alter table auction_sessions add column if not exists lots_mode text not null default 'full';
alter table auction_sessions drop constraint if exists auction_sessions_lots_mode_check;
alter table auction_sessions add constraint auction_sessions_lots_mode_check
  check (lots_mode in ('full', 'short'));

alter table auction_sessions drop constraint if exists auction_sessions_rounds_total_check;
alter table auction_sessions add constraint auction_sessions_rounds_total_check
  check (rounds_total between 0 and 80);
alter table auction_sessions alter column rounds_total set default 0;
