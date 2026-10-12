/* global fetch, Buffer, setTimeout */
// For every legend / retired star in auction-prime-data.json: finds a photo
// from their playing days on Wikimedia Commons (picked by the date the photo
// was taken, framing and description), copies it into our Storage bucket and
// writes src/data/auctionPrime.ts. Photos are free-licensed; the author and
// licence are saved alongside so they can be credited.
//
// Usage: npm run fetch:prime-photos [-- --only "Cafu,Zico"] [-- --dry]
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '../.env.local') });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const BUCKET = 'game-assets';
const UA = 'Pichanguero/0.1 (football quiz app; image mirroring)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',').map((s) => s.trim()) : null;

const entries = JSON.parse(readFileSync(path.join(__dirname, 'auction-prime-data.json'), 'utf8'));
const outFile = path.resolve(__dirname, '../src/data/auctionPrime.ts');
const qaFile = process.env.PRIME_QA_FILE ?? null;

async function getJson(url) {
  for (let attempt = 0; attempt < 6; attempt++) {
    await sleep(500);
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

async function resolveQid(entry) {
  if (entry.qid) return entry.qid;
  const body = await getJson(
    `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(entry.search ?? entry.name)}&language=en&limit=10&format=json&origin=*`
  );
  const hit = (body?.search ?? []).find(
    (r) => /footballer|football player|soccer player|association football|football (manager|coach)|goalkeeper/i.test(r.description ?? '') && !/video game|bootleg|film|club|team|list of/i.test(r.description ?? '')
  );
  return hit?.id ?? null;
}

async function commonsCategory(qid) {
  const body = await getJson(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`);
  const claims = body?.entities?.[qid]?.claims ?? {};
  return {
    category: claims.P373?.[0]?.mainsnak?.datavalue?.value ?? null,
    p18: claims.P18?.[0]?.mainsnak?.datavalue?.value ?? null,
  };
}

const INFO = 'imageinfo&iiprop=extmetadata|size|mime|url&iiurlwidth=500&iiextmetadatafilter=DateTimeOriginal|ImageDescription|ObjectName|Artist|LicenseShortName';

function pagesOf(body) {
  return Object.values(body?.query?.pages ?? {}).filter((p) => p.imageinfo?.[0]);
}

async function candidateFiles(name, category, p18, terms = []) {
  const pages = new Map();
  const add = (list) => list.forEach((p) => pages.set(p.title, p));

  if (category) {
    const body = await getJson(
      `https://commons.wikimedia.org/w/api.php?action=query&generator=categorymembers&gcmtitle=${encodeURIComponent('Category:' + category)}&gcmtype=file&gcmlimit=150&prop=${INFO}&format=json&origin=*`
    );
    add(pagesOf(body));
  }
  const search = await getJson(
    `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(name)}&gsrlimit=50&prop=${INFO}&format=json&origin=*`
  );
  add(pagesOf(search));
  for (const term of terms) {
    const extra = await getJson(
      `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(term)}&gsrlimit=40&prop=${INFO}&format=json&origin=*`
    );
    add(pagesOf(extra));
  }
  if (p18) {
    const body = await getJson(
      `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent('File:' + p18)}&prop=${INFO}&format=json&origin=*`
    );
    add(pagesOf(body));
  }
  return [...pages.values()];
}

function stripHtml(s) {
  return (s ?? '').replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
}

function score(page, entry) {
  const info = page.imageinfo[0];
  const meta = info.extmetadata ?? {};
  const title = page.title.replace(/^File:/, '');
  const text = `${title} ${stripHtml(meta.ImageDescription?.value)} ${stripHtml(meta.ObjectName?.value)}`.toLowerCase();
  const lastName = entry.name.split(' ').pop().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const normText = text.normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (!/^image\/(jpeg|png)$/.test(info.mime ?? '')) return null;
  if ((info.width ?? 0) < 400) return null;
  const needle = entry.match ?? (entry.fullName ? entry.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') : lastName);
  if (!normText.includes(needle)) return null;

  const raw = meta.DateTimeOriginal?.value ?? '';
  const m = raw.match(/(19|20)\d{2}/) ?? title.match(/(19|20)\d{2}/);
  const year = m ? Number(m[0]) : null;
  let s = 0;
  if (year === null) s -= 1;
  else if (year >= entry.from - 1 && year <= entry.to + 1) s += 10;
  else if (year >= entry.from - 3 && year <= entry.to + 3) s += 3;
  else s -= 8;

  const ratio = info.height / info.width;
  if (ratio >= 0.85 && ratio <= 1.7) s += 3;
  else if (ratio < 0.7) s -= 3;

  if (/\b(match|vs\.?|v\.|world cup|copa|champions|playing|game|final|euro|league|cup)\b/.test(text)) s += 2;
  if (/\b(press|conference|interview|autograph|statue|wax|cartoon|caricature|supporters|crowd|logo|signature|gala|award|ceremony|party|premiere|panel|suit|talk|show|book)\b/.test(text)) s -= 4;

  return {
    title,
    year,
    score: s,
    width: info.width,
    height: info.height,
    thumb: info.thumburl ?? info.url,
    credit: [stripHtml(meta.Artist?.value), meta.LicenseShortName?.value].filter(Boolean).join(' · ').slice(0, 120),
  };
}

function describe(page) {
  const info = page.imageinfo[0];
  const meta = info.extmetadata ?? {};
  const title = page.title.replace(/^File:/, '');
  const m = (meta.DateTimeOriginal?.value ?? '').match(/(19|20)\d{2}/) ?? title.match(/(19|20)\d{2}/);
  return {
    title,
    year: m ? Number(m[0]) : null,
    score: 99,
    width: info.width,
    height: info.height,
    thumb: info.thumburl ?? info.url,
    credit: [stripHtml(meta.Artist?.value), meta.LicenseShortName?.value].filter(Boolean).join(' · ').slice(0, 120),
  };
}

async function mirror(slug, url) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
    if (res.status === 429) {
      await sleep(2500 * (attempt + 1));
      continue;
    }
    if (!res.ok) return null;
    const type = res.headers.get('content-type') ?? 'image/jpeg';
    const ext = type.includes('png') ? 'png' : 'jpg';
    const file = `prime/${slug}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(file, Buffer.from(await res.arrayBuffer()), { contentType: type, upsert: true });
    if (error) return null;
    await sleep(500);
    return supabase.storage.from(BUCKET).getPublicUrl(file).data.publicUrl;
  }
  return null;
}

const slugOf = (name) => name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const MIN_SCORE = 8;
const result = {};
const qa = [];

for (const entry of entries) {
  if (only && !only.includes(entry.name)) continue;
  if (entry.skip) {
    console.log(`${entry.name}: no good free photo -> keeps current photo`);
    result[entry.name] = { text: entry.text, photo: null, credit: null };
    continue;
  }
  let best = null;
  let qid = entry.qid ?? null;
  if (entry.file) {
    const body = await getJson(
      `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(entry.file)}&prop=${INFO}&format=json&origin=*`
    );
    const page = pagesOf(body)[0];
    best = page ? describe(page) : null;
  } else {
    qid = await resolveQid(entry);
    if (!qid) {
      console.log(`${entry.name}: no Wikidata match`);
      result[entry.name] = { text: entry.text, photo: null, credit: null };
      continue;
    }
    const { category, p18 } = await commonsCategory(qid);
    const files = await candidateFiles(entry.name, category, p18, entry.terms ?? []);
    const ranked = files.map((f) => score(f, entry)).filter(Boolean).sort((a, b) => b.score - a.score || b.width - a.width);
    best = ranked[0] ?? null;
    qa.push({ name: entry.name, qid, category, candidates: ranked.slice(0, 8) });
  }

  if (!best || best.score < MIN_SCORE) {
    console.log(`${entry.name} (${qid}): nothing good enough (best ${best ? `${best.score} / ${best.year}` : 'none'}) -> keeps current photo`);
    result[entry.name] = { text: entry.text, photo: null, credit: null };
    continue;
  }
  console.log(`${entry.name} (${qid}): ${best.title} · ${best.year ?? '?'} · score ${best.score}`);
  const photo = DRY ? best.thumb : await mirror(slugOf(entry.name), best.thumb);
  result[entry.name] = { text: entry.text, photo: photo ?? null, credit: photo ? best.credit : null };
}

if (qaFile) {
  mkdirSync(path.dirname(qaFile), { recursive: true });
  writeFileSync(qaFile, JSON.stringify(qa, null, 2));
}

if (!DRY && !only) {
  const body = Object.entries(result)
    .map(([name, v]) => `  ${JSON.stringify(name)}: { text: ${JSON.stringify(v.text)}, photo: ${JSON.stringify(v.photo)}, credit: ${JSON.stringify(v.credit)} },`)
    .join('\n');
  writeFileSync(
    outFile,
    `// Generated by scripts/fetch-prime-photos.mjs: do not edit by hand.\n` +
      `// "Prime" clue and a playing-days photo for legends and retired stars.\n` +
      `export interface PrimeInfo {\n  text: string;\n  /** public Storage URL, or null to keep the player's current photo */\n  photo: string | null;\n  /** author · licence of the Commons photo */\n  credit: string | null;\n}\n\n` +
      `export const AUCTION_PRIME: Record<string, PrimeInfo> = {\n${body}\n};\n`
  );
  console.log(`Wrote ${outFile}`);
}
