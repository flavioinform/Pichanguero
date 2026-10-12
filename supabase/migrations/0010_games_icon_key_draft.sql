-- The `games` table has its own check constraint on icon_key (separate
-- from the app-side IconKey type) restricting it to the icons that existed
-- when that table was first created — doesn't yet know about 'draft'.
alter table games drop constraint if exists games_icon_key_check;
alter table games add constraint games_icon_key_check check (icon_key in ('grid', 'dice', 'help', 'draft'));
