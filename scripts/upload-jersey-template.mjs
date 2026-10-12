// Uploads the neutral jersey photo template (used by the career-mode avatar,
// recolored per nationality + overlaid with name/number in the UI) to the
// same public Storage bucket the menu background assets live in.
//
// Usage: npm run upload:jersey-template
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
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local. See .env.example.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);
const ASSETS_BUCKET = 'game-assets';
const FILE = 'jersey-template.jpg';
const filePath = path.resolve(__dirname, '../design/career-assets/jersey-template.jpg');

async function main() {
  const fileBuffer = readFileSync(filePath);
  const { error } = await supabase.storage
    .from(ASSETS_BUCKET)
    .upload(FILE, fileBuffer, { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from(ASSETS_BUCKET).getPublicUrl(FILE);
  console.log(`Uploaded ${FILE} -> ${data.publicUrl}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
