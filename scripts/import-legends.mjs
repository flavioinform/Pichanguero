/* global fetch, Buffer, setTimeout */
// Adds a hand-curated set of football legends missing from the imported
// Transfermarkt dataset — mostly pre-2000s era (Pelé, Maradona, etc.), but
// also a few surprising modern-era gaps found by hand (Ronaldo Nazário:
// the "Ronaldo"s the import does have are all much younger current
// players, international_caps 0 — not him). Facts (caps, position, clubs)
// are hand-verified; photos come from Wikidata/Wikimedia Commons via each
// player's QID. IDs use a dedicated high range so they can never collide
// with a real Transfermarkt player id (current max is ~1.5M as of this
// writing).
//
// Usage: npm run import:legends
import { createClient } from '@supabase/supabase-js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, serviceRoleKey);

const LEGEND_ID_BASE = 900_000_000;

// clubId values resolved by name against the existing `clubs` table (see
// the probe run in chat) — not guessed.
const LEGENDS = [
  { name: 'Pelé', wikidataId: 'Q12897', countryOfCitizenship: 'Brazil', position: 'Attack', subPosition: 'Centre-Forward', internationalCaps: 92, clubIds: [221] },
  { name: 'Diego Maradona', wikidataId: 'Q17515', countryOfCitizenship: 'Argentina', position: 'Attack', subPosition: 'Second Striker', internationalCaps: 91, clubIds: [189, 6195, 131] },
  { name: 'Alfredo Di Stéfano', wikidataId: 'Q164546', countryOfCitizenship: 'Argentina', position: 'Attack', subPosition: 'Centre-Forward', internationalCaps: 31, clubIds: [209, 418] },
  { name: 'Franz Beckenbauer', wikidataId: 'Q4457', countryOfCitizenship: 'Germany', position: 'Defender', subPosition: 'Sweeper', internationalCaps: 103, clubIds: [27] },
  { name: 'Johan Cruyff', wikidataId: 'Q17163', countryOfCitizenship: 'Netherlands', position: 'Attack', subPosition: 'Centre-Forward', internationalCaps: 48, clubIds: [610, 131] },
  { name: 'Eusébio', wikidataId: 'Q162043', countryOfCitizenship: 'Portugal', position: 'Attack', subPosition: 'Centre-Forward', internationalCaps: 64, clubIds: [294] },
  { name: 'Ferenc Puskás', wikidataId: 'Q482931', countryOfCitizenship: 'Hungary', position: 'Attack', subPosition: 'Centre-Forward', internationalCaps: 85, clubIds: [418] },
  { name: 'Garrincha', wikidataId: 'Q180642', countryOfCitizenship: 'Brazil', position: 'Attack', subPosition: 'Right Winger', internationalCaps: 50, clubIds: [537] },
  { name: 'Bobby Charlton', wikidataId: 'Q171583', countryOfCitizenship: 'England', position: 'Midfield', subPosition: 'Attacking Midfield', internationalCaps: 106, clubIds: [985] },
  { name: 'Bobby Moore', wikidataId: 'Q191492', countryOfCitizenship: 'England', position: 'Defender', subPosition: 'Centre-Back', internationalCaps: 108, clubIds: [379] },
  { name: 'Michel Platini', wikidataId: 'Q4261', countryOfCitizenship: 'France', position: 'Midfield', subPosition: 'Attacking Midfield', internationalCaps: 72, clubIds: [506] },
  { name: 'Zico', wikidataId: 'Q47526', countryOfCitizenship: 'Brazil', position: 'Midfield', subPosition: 'Attacking Midfield', internationalCaps: 71, clubIds: [614] },
  { name: 'Gerd Müller', wikidataId: 'Q43744', countryOfCitizenship: 'Germany', position: 'Attack', subPosition: 'Centre-Forward', internationalCaps: 62, clubIds: [27] },
  { name: 'George Best', wikidataId: 'Q164521', countryOfCitizenship: 'Northern Ireland', position: 'Attack', subPosition: 'Right Winger', internationalCaps: 37, clubIds: [985] },
  { name: 'Marco van Basten', wikidataId: 'Q483629', countryOfCitizenship: 'Netherlands', position: 'Attack', subPosition: 'Centre-Forward', internationalCaps: 58, clubIds: [610, 5] },
  { name: 'Ronaldo Nazário', wikidataId: 'Q529207', countryOfCitizenship: 'Brazil', position: 'Attack', subPosition: 'Centre-Forward', internationalCaps: 98, clubIds: [609, 383, 131, 46, 418, 5, 199] },

  // Second batch: household names the dataset lacks. wikidataId is null on
  // purpose: the photo is looked up by name (see resolveWikidataId). They
  // have no club stints, so they only count for nationality/caps criteria.
  { name: 'Zinedine Zidane', wikidataId: null, countryOfCitizenship: 'France', position: 'Midfield', subPosition: 'Attacking Midfield', internationalCaps: 108, clubIds: [] },
  { name: 'Ronaldinho', wikidataId: 'Q39444', countryOfCitizenship: 'Brazil', position: 'Midfield', subPosition: 'Attacking Midfield', internationalCaps: 97, clubIds: [] },
  { name: 'Thierry Henry', wikidataId: null, countryOfCitizenship: 'France', position: 'Attack', subPosition: 'Centre-Forward', internationalCaps: 123, clubIds: [] },
  { name: 'Paolo Maldini', wikidataId: null, countryOfCitizenship: 'Italy', position: 'Defender', subPosition: 'Left-Back', internationalCaps: 126, clubIds: [] },
  { name: 'Cafu', wikidataId: null, countryOfCitizenship: 'Brazil', position: 'Defender', subPosition: 'Right-Back', internationalCaps: 142, clubIds: [] },
  { name: 'Roberto Carlos', wikidataId: null, countryOfCitizenship: 'Brazil', position: 'Defender', subPosition: 'Left-Back', internationalCaps: 125, clubIds: [] },
  { name: 'Rivaldo', wikidataId: null, countryOfCitizenship: 'Brazil', position: 'Midfield', subPosition: 'Attacking Midfield', internationalCaps: 74, clubIds: [] },
  { name: 'Gabriel Batistuta', wikidataId: null, countryOfCitizenship: 'Argentina', position: 'Attack', subPosition: 'Centre-Forward', internationalCaps: 78, clubIds: [] },
  { name: 'Roberto Baggio', wikidataId: null, countryOfCitizenship: 'Italy', position: 'Attack', subPosition: 'Second Striker', internationalCaps: 56, clubIds: [] },
  { name: 'Alessandro Del Piero', wikidataId: null, countryOfCitizenship: 'Italy', position: 'Attack', subPosition: 'Second Striker', internationalCaps: 91, clubIds: [] },
  { name: 'Dennis Bergkamp', wikidataId: null, countryOfCitizenship: 'Netherlands', position: 'Attack', subPosition: 'Second Striker', internationalCaps: 79, clubIds: [] },
  { name: 'Ruud Gullit', wikidataId: null, countryOfCitizenship: 'Netherlands', position: 'Midfield', subPosition: 'Attacking Midfield', internationalCaps: 66, clubIds: [] },
  { name: 'Lothar Matthäus', wikidataId: null, countryOfCitizenship: 'Germany', position: 'Midfield', subPosition: 'Central Midfield', internationalCaps: 150, clubIds: [] },
  { name: 'Lev Yashin', wikidataId: 'Q167828', countryOfCitizenship: 'Russia', position: 'Goalkeeper', subPosition: 'Goalkeeper', internationalCaps: 78, clubIds: [] },
  { name: 'Oliver Kahn', wikidataId: null, countryOfCitizenship: 'Germany', position: 'Goalkeeper', subPosition: 'Goalkeeper', internationalCaps: 86, clubIds: [] },
  { name: 'Peter Schmeichel', wikidataId: null, countryOfCitizenship: 'Denmark', position: 'Goalkeeper', subPosition: 'Goalkeeper', internationalCaps: 129, clubIds: [] },
  { name: 'Dino Zoff', wikidataId: null, countryOfCitizenship: 'Italy', position: 'Goalkeeper', subPosition: 'Goalkeeper', internationalCaps: 112, clubIds: [] },
  { name: 'Gordon Banks', wikidataId: null, countryOfCitizenship: 'England', position: 'Goalkeeper', subPosition: 'Goalkeeper', internationalCaps: 73, clubIds: [] },
  { name: 'Diego Forlán', wikidataId: null, countryOfCitizenship: 'Uruguay', position: 'Attack', subPosition: 'Centre-Forward', internationalCaps: 112, clubIds: [] },
  { name: 'Luís Figo', wikidataId: null, countryOfCitizenship: 'Portugal', position: 'Attack', subPosition: 'Right Winger', internationalCaps: 127, clubIds: [] },
  { name: 'Alessandro Nesta', wikidataId: null, countryOfCitizenship: 'Italy', position: 'Defender', subPosition: 'Centre-Back', internationalCaps: 78, clubIds: [] },
  { name: 'Fabio Cannavaro', wikidataId: null, countryOfCitizenship: 'Italy', position: 'Defender', subPosition: 'Centre-Back', internationalCaps: 136, clubIds: [] },
  { name: 'Franco Baresi', wikidataId: null, countryOfCitizenship: 'Italy', position: 'Defender', subPosition: 'Centre-Back', internationalCaps: 81, clubIds: [] },
  { name: 'Clarence Seedorf', wikidataId: null, countryOfCitizenship: 'Netherlands', position: 'Midfield', subPosition: 'Central Midfield', internationalCaps: 87, clubIds: [] },
  { name: 'Hristo Stoichkov', wikidataId: null, countryOfCitizenship: 'Bulgaria', position: 'Attack', subPosition: 'Centre-Forward', internationalCaps: 83, clubIds: [] },
  { name: 'Xavi Hernández', wikidataId: null, countryOfCitizenship: 'Spain', position: 'Midfield', subPosition: 'Central Midfield', internationalCaps: 133, clubIds: [] },
  { name: 'Raúl González', wikidataId: null, countryOfCitizenship: 'Spain', position: 'Attack', subPosition: 'Centre-Forward', internationalCaps: 102, clubIds: [] },
  { name: 'Juan Román Riquelme', wikidataId: null, countryOfCitizenship: 'Argentina', position: 'Midfield', subPosition: 'Attacking Midfield', internationalCaps: 51, clubIds: [] },
  { name: 'Mario Kempes', wikidataId: null, countryOfCitizenship: 'Argentina', position: 'Attack', subPosition: 'Centre-Forward', internationalCaps: 43, clubIds: [] },
  { name: 'Kenny Dalglish', wikidataId: null, countryOfCitizenship: 'Scotland', position: 'Attack', subPosition: 'Second Striker', internationalCaps: 102, clubIds: [] },
  { name: 'George Weah', wikidataId: 'Q173139', countryOfCitizenship: 'Liberia', position: 'Attack', subPosition: 'Centre-Forward', internationalCaps: 60, clubIds: [] },
  { name: 'Roger Milla', wikidataId: null, countryOfCitizenship: 'Cameroon', position: 'Attack', subPosition: 'Centre-Forward', internationalCaps: 77, clubIds: [] },
];

const ASSETS_BUCKET = 'game-assets';
// Wikimedia asks automated clients to identify themselves; without a
// User-Agent it answers 429 much sooner.
const UA = 'Pichanguero/0.1 (football quiz app; image mirroring)';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** GET a Wikidata JSON endpoint politely: pause between calls and retry
 * when it answers with its "too many requests" text instead of JSON. */
async function wikiJson(url) {
  for (let attempt = 0; attempt < 6; attempt++) {
    await sleep(900);
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      await sleep(3000 * (attempt + 1));
    }
  }
  return null;
}

/** Looks a footballer up on Wikidata by name: the first hit whose
 * description reads like a footballer (and not a video game, film or club).
 * Logged so a wrong match is easy to spot. */
async function resolveWikidataId(name, searchName = name, descHint = null) {
  const body = await wikiJson(
    `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(searchName)}&language=en&limit=10&format=json&origin=*`
  );
  const hit = (body?.search ?? []).find(
    (r) => /footballer|football player|soccer player|association football|football (manager|coach)|goalkeeper/i.test(r.description ?? '') && !/video game|bootleg|film|club|team|list of/i.test(r.description ?? '') && (!descHint || descHint.test(r.description ?? ''))
  );
  if (hit) console.log(`  ${name} -> ${hit.id} (${hit.description})`);
  else console.log(`  ${name} -> no footballer match on Wikidata`);
  return hit?.id ?? null;
}

/** Copies a Wikimedia photo into our own public Storage bucket and returns
 * that URL (hot-linking Wikimedia from the app gets random 429s). Falls
 * back to the original URL if the download keeps failing. */
async function mirrorImage(id, sourceUrl) {
  if (!sourceUrl) return null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(sourceUrl, { headers: { 'User-Agent': UA }, redirect: 'follow' });
    if (res.status === 429) {
      await sleep(2000 * (attempt + 1));
      continue;
    }
    if (!res.ok) break;
    const contentType = res.headers.get('content-type') ?? 'image/jpeg';
    if (!contentType.startsWith('image/')) break;
    const ext = contentType.includes('png') ? 'png' : 'jpg';
    const path = `legends/${id}.${ext}`;
    const { error } = await supabase.storage.from(ASSETS_BUCKET).upload(path, Buffer.from(await res.arrayBuffer()), { contentType, upsert: true });
    if (error) break;
    await sleep(600);
    return supabase.storage.from(ASSETS_BUCKET).getPublicUrl(path).data.publicUrl;
  }
  return sourceUrl;
}

async function fetchImageUrl(wikidataId) {
  if (!wikidataId) return null;
  const body = await wikiJson(`https://www.wikidata.org/wiki/Special:EntityData/${wikidataId}.json`);
  const entity = body?.entities?.[wikidataId];
  const claim = entity?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
  if (!claim) return null;
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(claim)}?width=400`;
}

async function main() {
  // Skip anyone already present under this name AND country — name alone
  // isn't enough: the dataset already has two completely different modern
  // players called "Pelé" (Portuguese and Guinea-Bissaun), neither the
  // real Brazilian one, and matching on name alone wrongly treated the
  // real legend as a duplicate of them the first time this ran.
  const names = LEGENDS.map((l) => l.name);
  const { data: existing, error: existingError } = await supabase
    .from('players')
    .select('id,name,country_of_citizenship')
    .in('name', names);
  if (existingError) throw new Error(existingError.message);
  const existingKeys = new Set((existing ?? []).map((p) => `${p.name}|${p.country_of_citizenship}`));

  const toInsert = LEGENDS.filter((l) => !existingKeys.has(`${l.name}|${l.countryOfCitizenship}`));
  const skipped = LEGENDS.filter((l) => existingKeys.has(`${l.name}|${l.countryOfCitizenship}`));
  if (skipped.length > 0) {
    console.log('Already present, skipping:', skipped.map((l) => l.name).join(', '));
  }
  if (process.argv.includes('--dry')) {
    console.log(`Dry run: ${toInsert.length} legends would be inserted. Wikidata matches:`);
    for (const legend of toInsert) {
      const qid = legend.wikidataId ?? (await resolveWikidataId(legend.name, legend.searchName, legend.descHint));
      const photo = await fetchImageUrl(qid);
      console.log(`    ${legend.name}: ${photo ? 'photo found' : 'NO PHOTO'}`);
    }
    return;
  }

  if (toInsert.length === 0) {
    console.log('Nothing to insert.');
    await mirrorExistingLegends();
    return;
  }

  // Continue from whatever legend id is already highest, rather than
  // always restarting at LEGEND_ID_BASE — otherwise a second run adding
  // just a couple of new names would recompute low indices that collide
  // with legends a prior run already inserted.
  const { data: maxLegend } = await supabase
    .from('players')
    .select('id')
    .gte('id', LEGEND_ID_BASE)
    .order('id', { ascending: false })
    .limit(1);
  let nextId = (maxLegend?.[0]?.id ?? LEGEND_ID_BASE - 1) + 1;

  const playerRows = [];
  const stintRows = [];

  for (let i = 0; i < toInsert.length; i++) {
    const legend = toInsert[i];
    const id = nextId++;
    process.stdout.write(`\rFetching photos: ${i + 1}/${toInsert.length}`);
    const wikidataId = legend.wikidataId ?? (await resolveWikidataId(legend.name, legend.searchName, legend.descHint));
    const imageUrl = await mirrorImage(id, await fetchImageUrl(wikidataId));

    playerRows.push({
      id,
      name: legend.name,
      date_of_birth: null,
      country_of_citizenship: legend.countryOfCitizenship,
      position: legend.position,
      sub_position: legend.subPosition,
      foot: null,
      height_in_cm: null,
      current_club_id: legend.clubIds[0] ?? null,
      current_national_team_id: null,
      international_caps: legend.internationalCaps,
      image_url: imageUrl,
    });

    for (const clubId of legend.clubIds) {
      stintRows.push({ player_id: id, club_id: clubId, club_name: null, transfer_date: null });
    }
  }
  console.log();

  const { error: insertError } = await supabase.from('players').insert(playerRows);
  if (insertError) throw new Error(`players: ${insertError.message}`);
  console.log(`Inserted ${playerRows.length} legends.`);

  if (stintRows.length > 0) {
    const { error: stintError } = await supabase.from('player_club_stints').insert(stintRows);
    if (stintError) throw new Error(`player_club_stints: ${stintError.message}`);
    console.log(`Inserted ${stintRows.length} club stints.`);
  }
  await mirrorExistingLegends();
}

/** Legends inserted by an earlier run still point at Wikimedia: move them
 * to our own Storage too. Safe to repeat, already-mirrored rows are skipped. */
async function mirrorExistingLegends() {
  const { data, error } = await supabase
    .from('players')
    .select('id,name,image_url')
    .gte('id', LEGEND_ID_BASE)
    .like('image_url', '%wikimedia.org%');
  if (error) throw new Error(error.message);
  for (const row of data ?? []) {
    const mirrored = await mirrorImage(row.id, row.image_url);
    if (mirrored && mirrored !== row.image_url) {
      const { error: updateError } = await supabase.from('players').update({ image_url: mirrored }).eq('id', row.id);
      if (updateError) throw new Error(updateError.message);
      console.log(`Mirrored photo: ${row.name}`);
    } else {
      console.log(`Could not mirror (kept Wikimedia URL): ${row.name}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
