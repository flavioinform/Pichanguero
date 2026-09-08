-- Reference football data (Transfermarkt / player-scores dataset) that
-- powers Gato futbolero's grid criteria: club, selección (national team)
-- and época (via player_club_stints, derived from transfer history).
-- Read-only for the app; populated by scripts/import-football-data.mjs.

create table if not exists countries (
  id bigint primary key,
  name text not null,
  code text,
  confederation text
);

create table if not exists competitions (
  id text primary key,
  name text not null,
  country_name text,
  competition_type text
);

create table if not exists clubs (
  id bigint primary key,
  name text not null,
  competition_id text references competitions(id),
  url text
);

create table if not exists national_teams (
  id bigint primary key,
  name text not null,
  country_name text,
  confederation text,
  fifa_ranking int
);

create table if not exists players (
  id bigint primary key,
  name text not null,
  date_of_birth date,
  country_of_citizenship text,
  position text,
  sub_position text,
  foot text,
  height_in_cm int,
  current_club_id bigint references clubs(id),
  current_national_team_id bigint references national_teams(id),
  international_caps int not null default 0,
  image_url text
);

create index if not exists players_current_club_id_idx on players(current_club_id);
create index if not exists players_current_national_team_id_idx on players(current_national_team_id);
create index if not exists players_country_of_citizenship_idx on players(country_of_citizenship);

-- One row per transfer arrival: approximates "player X was at club Y around
-- season Z", used for the "época" grid criterion (era-bucketed queries).
create table if not exists player_club_stints (
  id bigserial primary key,
  player_id bigint not null references players(id),
  club_id bigint references clubs(id),
  club_name text,
  transfer_date date
);

create index if not exists player_club_stints_player_id_idx on player_club_stints(player_id);
create index if not exists player_club_stints_club_id_idx on player_club_stints(club_id);

alter table countries enable row level security;
alter table competitions enable row level security;
alter table clubs enable row level security;
alter table national_teams enable row level security;
alter table players enable row level security;
alter table player_club_stints enable row level security;

create policy "countries are publicly readable" on countries for select using (true);
create policy "competitions are publicly readable" on competitions for select using (true);
create policy "clubs are publicly readable" on clubs for select using (true);
create policy "national_teams are publicly readable" on national_teams for select using (true);
create policy "players are publicly readable" on players for select using (true);
create policy "player_club_stints are publicly readable" on player_club_stints for select using (true);
