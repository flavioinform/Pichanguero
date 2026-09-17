// Imports the player-scores (Transfermarkt) CSVs into the football data
// tables created by supabase/migrations/0002_football_data.sql.
//
// Usage:
//   1. Run supabase/migrations/0002_football_data.sql in the SQL editor.
//   2. Extract players.csv, clubs.csv, competitions.csv, countries.csv,
//      national_teams.csv, transfers.csv into data/player-scores/.
//   3. npm run import:football
import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local. See .env.example.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);
const dataDir = path.resolve(__dirname, '../data/player-scores');

const BATCH_SIZE = 1000;

function readCsv(file) {
  return createReadStream(path.join(dataDir, file)).pipe(
    parse({ columns: true, relax_column_count: true, skip_empty_lines: true })
  );
}

function toIntOrNull(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? null : n;
}

function toDateOrNull(value) {
  if (!value) return null;
  const date = value.split(' ')[0];
  return date || null;
}

async function upsertInBatches(table, rows, onConflict) {
  let count = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from(table).upsert(batch, { onConflict });
    if (error) throw new Error(`${table}: ${error.message}`);
    count += batch.length;
    process.stdout.write(`\r${table}: ${count}/${rows.length}`);
  }
  console.log();
}

async function insertInBatches(table, rows) {
  let count = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from(table).insert(batch);
    if (error) throw new Error(`${table}: ${error.message}`);
    count += batch.length;
    process.stdout.write(`\r${table}: ${count}/${rows.length}`);
  }
  console.log();
}

async function collect(stream, mapRow) {
  const rows = [];
  for await (const record of stream) {
    const mapped = mapRow(record);
    if (mapped) rows.push(mapped);
  }
  return rows;
}

async function importCountries() {
  const rows = await collect(readCsv('countries.csv'), (r) => {
    const id = toIntOrNull(r.country_id);
    if (id === null) return null;
    return { id, name: r.country_name, code: r.country_code || null, confederation: r.confederation || null };
  });
  await upsertInBatches('countries', rows, 'id');
}

async function importCompetitions() {
  const rows = await collect(readCsv('competitions.csv'), (r) => {
    if (!r.competition_id) return null;
    return {
      id: r.competition_id,
      name: r.name,
      country_name: r.country_name || null,
      competition_type: r.type || null,
    };
  });
  await upsertInBatches('competitions', rows, 'id');
}

async function importClubs(validCompetitionIds) {
  const rows = await collect(readCsv('clubs.csv'), (r) => {
    const id = toIntOrNull(r.club_id);
    if (id === null) return null;
    return {
      id,
      name: r.name,
      competition_id: r.domestic_competition_id && validCompetitionIds.has(r.domestic_competition_id)
        ? r.domestic_competition_id
        : null,
      url: r.url || null,
      coach_name: r.coach_name || null,
    };
  });
  await upsertInBatches('clubs', rows, 'id');
}

async function importNationalTeams() {
  const rows = await collect(readCsv('national_teams.csv'), (r) => {
    const id = toIntOrNull(r.national_team_id);
    if (id === null) return null;
    return {
      id,
      name: r.name,
      country_name: r.country_name || null,
      confederation: r.confederation || null,
      fifa_ranking: toIntOrNull(r.fifa_ranking),
    };
  });
  await upsertInBatches('national_teams', rows, 'id');
}

async function importPlayers(validClubIds, validNationalTeamIds) {
  const rows = await collect(readCsv('players.csv'), (r) => {
    const id = toIntOrNull(r.player_id);
    if (id === null || !r.name) return null;
    const currentClubId = toIntOrNull(r.current_club_id);
    const currentNationalTeamId = toIntOrNull(r.current_national_team_id);
    return {
      id,
      name: r.name,
      date_of_birth: toDateOrNull(r.date_of_birth),
      country_of_citizenship: r.country_of_citizenship || null,
      position: r.position || null,
      sub_position: r.sub_position || null,
      foot: r.foot || null,
      height_in_cm: toIntOrNull(r.height_in_cm),
      current_club_id: currentClubId !== null && validClubIds.has(currentClubId) ? currentClubId : null,
      current_national_team_id:
        currentNationalTeamId !== null && validNationalTeamIds.has(currentNationalTeamId)
          ? currentNationalTeamId
          : null,
      international_caps: toIntOrNull(r.international_caps) ?? 0,
      image_url: r.image_url || null,
    };
  });
  await upsertInBatches('players', rows, 'id');
  return new Set(rows.map((r) => r.id));
}

async function importPlayerClubStints(validPlayerIds, validClubIds) {
  await supabase.from('player_club_stints').delete().neq('id', 0);

  const rows = await collect(readCsv('transfers.csv'), (r) => {
    const playerId = toIntOrNull(r.player_id);
    const clubId = toIntOrNull(r.to_club_id);
    if (playerId === null || !validPlayerIds.has(playerId)) return null;
    return {
      player_id: playerId,
      club_id: clubId !== null && validClubIds.has(clubId) ? clubId : null,
      club_name: r.to_club_name || null,
      transfer_date: toDateOrNull(r.transfer_date),
    };
  });
  await insertInBatches('player_club_stints', rows);
}

async function main() {
  console.log('Importing countries...');
  await importCountries();

  console.log('Importing competitions...');
  await importCompetitions();
  const { data: compRows } = await supabase.from('competitions').select('id');
  const validCompetitionIds = new Set((compRows ?? []).map((r) => r.id));

  console.log('Importing clubs...');
  await importClubs(validCompetitionIds);
  const { data: clubRows } = await supabase.from('clubs').select('id');
  const validClubIds = new Set((clubRows ?? []).map((r) => r.id));

  console.log('Importing national teams...');
  await importNationalTeams();
  const { data: ntRows } = await supabase.from('national_teams').select('id');
  const validNationalTeamIds = new Set((ntRows ?? []).map((r) => r.id));

  console.log('Importing players...');
  const validPlayerIds = await importPlayers(validClubIds, validNationalTeamIds);

  console.log('Importing player club stints (from transfers)...');
  await importPlayerClubStints(validPlayerIds, validClubIds);

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
