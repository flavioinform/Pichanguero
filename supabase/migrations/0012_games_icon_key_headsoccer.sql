-- Extend the `games.icon_key` check constraint to allow 'headsoccer', for
-- the new physics-based Head Soccer minigame.
alter table games drop constraint if exists games_icon_key_check;
alter table games add constraint games_icon_key_check check (icon_key in ('grid', 'dice', 'help', 'draft', 'career', 'headsoccer'));
