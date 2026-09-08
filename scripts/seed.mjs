// Uploads the reference design assets to Supabase Storage and seeds the
// `games` table. Run once after applying supabase/migrations/0001_init.sql.
//
// Usage:
//   1. cp .env.example .env.local and fill in the three Supabase values.
//   2. npm run seed
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    'Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local. See .env.example.'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);
const ASSETS_BUCKET = 'game-assets';
const assetsDir = path.resolve(__dirname, '../design/design_handoff_menu_principal/assets');

const assetFiles = [
  { file: 'pichanguero-logo.png', contentType: 'image/png' },
  { file: 'bg-gato.png', contentType: 'image/png' },
  { file: 'bg-tutti.png', contentType: 'image/png' },
  { file: 'bg-adivina.png', contentType: 'image/png' },
];

async function ensureBucket() {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw error;
  if (buckets.some((b) => b.name === ASSETS_BUCKET)) return;

  const { error: createError } = await supabase.storage.createBucket(ASSETS_BUCKET, { public: true });
  if (createError) throw createError;
  console.log(`Created public bucket "${ASSETS_BUCKET}"`);
}

async function uploadAssets() {
  const urls = {};
  for (const { file, contentType } of assetFiles) {
    const filePath = path.join(assetsDir, file);
    const fileBuffer = readFileSync(filePath);

    const { error } = await supabase.storage
      .from(ASSETS_BUCKET)
      .upload(file, fileBuffer, { contentType, upsert: true });
    if (error) throw error;

    const { data } = supabase.storage.from(ASSETS_BUCKET).getPublicUrl(file);
    urls[file] = data.publicUrl;
    console.log(`Uploaded ${file} -> ${data.publicUrl}`);
  }
  return urls;
}

async function seedGames(urls) {
  const games = [
    {
      id: 'gato',
      name: 'Gato futbolero',
      short_desc:
        'Adivina futbolistas cruzando criterios de fila y columna, al estilo grilla. Compite por turnos con otro jugador online.',
      how_to_play:
        'Cada celda cruza dos criterios (club, selección, época). Escribe un jugador que cumpla ambos. Ganas puntos por cada celda correcta; luego le toca a tu rival.',
      icon_key: 'grid',
      bg_image_url: urls['bg-gato.png'],
      is_flagship: true,
      sort_order: 1,
    },
    {
      id: 'tutti',
      name: 'Tutti frutti futbolero',
      short_desc: 'El clásico tutti frutti, pero con categorías de fútbol: clubes, países, jugadores y más.',
      how_to_play:
        'Sale una letra al azar. Completa cada categoría con una palabra que empiece con esa letra antes de que se acabe el tiempo.',
      icon_key: 'dice',
      bg_image_url: urls['bg-tutti.png'],
      is_flagship: false,
      sort_order: 2,
    },
    {
      id: 'adivina',
      name: 'Adivina el jugador',
      short_desc: 'Un jugador misterioso y pistas que se revelan de a poco. ¿Cuántos intentos necesitas?',
      how_to_play:
        'Cada intento fallido revela una pista nueva (club, país, posición). Adivina el jugador correcto en el menor número de intentos.',
      icon_key: 'help',
      bg_image_url: urls['bg-adivina.png'],
      is_flagship: false,
      sort_order: 3,
    },
  ];

  const { error } = await supabase.from('games').upsert(games, { onConflict: 'id' });
  if (error) throw error;
  console.log(`Seeded ${games.length} games.`);
}

async function main() {
  await ensureBucket();
  const urls = await uploadAssets();
  await seedGames(urls);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
