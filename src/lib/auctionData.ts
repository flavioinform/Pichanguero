import { supabase } from './supabaseClient';
import type { AuctionLot } from './auctionEngine';
import { CAPS_OVERRIDE, STAR_IDS, STAR_NATIONS } from './auctionStars';
import { AUCTION_PRIME } from '../data/auctionPrime';
import { groupOf, POSITION_BY_GROUP, type PositionGroup } from './auctionFormations';
import { AUCTION } from '../config/gameConfig';

const LOT_COLUMNS =
  'id, name, image_url, country_of_citizenship, position, sub_position, foot, height_in_cm, date_of_birth, international_caps, clubs(name)';

/** Hand-curated legends (Pelé, Maradona, Zidane…) live in a dedicated high
 * id range — see scripts/import-legends.mjs. */
const LEGEND_ID_BASE = 900_000_000;

interface LotRow {
  id: number;
  name: string;
  image_url: string | null;
  country_of_citizenship: string | null;
  position: string | null;
  sub_position: string | null;
  foot: string | null;
  height_in_cm: number | null;
  date_of_birth: string | null;
  international_caps: number;
  clubs: { name: string } | null;
}

const STAR_ID_SET = new Set(STAR_IDS);

function mapLot(row: LotRow): AuctionLot {
  // Legends and the curated retired stars get a "prime" clue and, when we
  // found one, a photo from their playing days instead of a recent portrait.
  // Guarded by id so a namesake from the fallback pool can't pick it up.
  const iconic = row.id >= LEGEND_ID_BASE || STAR_ID_SET.has(row.id);
  const prime = iconic ? (AUCTION_PRIME[row.name] ?? null) : null;
  return {
    id: row.id,
    name: row.name,
    imageUrl: prime?.photo ?? row.image_url,
    prime: prime?.text ?? null,
    country: row.country_of_citizenship,
    position: row.position,
    subPosition: row.sub_position,
    foot: row.foot,
    heightCm: row.height_in_cm,
    birthYear: row.date_of_birth ? new Date(row.date_of_birth).getFullYear() : null,
    clubName: row.clubs?.name ?? null,
    caps: CAPS_OVERRIDE[row.id] ?? row.international_caps,
  };
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function fetchStarPool(): Promise<AuctionLot[]> {
  const { data, error } = await supabase
    .from('players')
    .select(LOT_COLUMNS)
    .in('id', STAR_IDS)
    .not('image_url', 'is', null);
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as LotRow[]).map(mapLot);
}

async function fetchLegendPool(): Promise<AuctionLot[]> {
  const { data, error } = await supabase
    .from('players')
    .select(LOT_COLUMNS)
    .gte('id', LEGEND_ID_BASE)
    .not('image_url', 'is', null);
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as LotRow[]).map(mapLot);
}

/** Last resort for a position the curated pool can't cover: long-serving
 * internationals from the nations that produce the big names, best-known
 * (most caps) first. */
async function fetchFallbackLots(group: PositionGroup, count: number, excludeIds: Set<number>): Promise<AuctionLot[]> {
  const { data, error } = await supabase
    .from('players')
    .select(LOT_COLUMNS)
    .eq('position', POSITION_BY_GROUP[group])
    .in('country_of_citizenship', STAR_NATIONS)
    .not('image_url', 'is', null)
    .gte('international_caps', AUCTION.fallbackMinCaps)
    .lt('id', LEGEND_ID_BASE)
    .order('international_caps', { ascending: false })
    .limit(count + excludeIds.size + 10);
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as LotRow[])
    .map(mapLot)
    .filter((l) => !excludeIds.has(l.id))
    .slice(0, count);
}

/** All the lots for a match: mostly curated superstars, a good share of
 * legends, never an unknown unless the famous pool is exhausted. Mixed so
 * positions come up in random order. */
export async function fetchFormationLots(perGroup: Record<PositionGroup, number>): Promise<AuctionLot[]> {
  const [stars, legends] = await Promise.all([fetchStarPool(), fetchLegendPool()]);
  const used = new Set<number>();
  const lots: AuctionLot[] = [];

  for (const group of (Object.keys(perGroup) as PositionGroup[]).filter((g) => perGroup[g] > 0)) {
    const legendPool = shuffle(legends.filter((l) => groupOf(l.position) === group));
    const starPool = shuffle(stars.filter((l) => groupOf(l.position) === group));
    const picked: AuctionLot[] = [];

    while (picked.length < perGroup[group] && (legendPool.length > 0 || starPool.length > 0)) {
      const wantLegend = Math.random() < AUCTION.legendChance;
      const next =
        wantLegend && legendPool.length > 0
          ? legendPool.pop()
          : starPool.length > 0
            ? starPool.pop()
            : legendPool.pop();
      if (next && !used.has(next.id)) {
        used.add(next.id);
        picked.push(next);
      }
    }

    if (picked.length < perGroup[group]) {
      const extra = await fetchFallbackLots(group, perGroup[group] - picked.length, used);
      extra.forEach((l) => used.add(l.id));
      picked.push(...extra);
    }
    if (picked.length < perGroup[group]) throw new Error('No hay suficientes jugadores para armar la subasta.');
    lots.push(...picked);
  }

  return shuffle(lots);
}

export async function fetchAuctionLotsByIds(ids: number[]): Promise<AuctionLot[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from('players').select(LOT_COLUMNS).in('id', ids);
  if (error) throw new Error(error.message);
  const byId = new Map(((data ?? []) as unknown as LotRow[]).map((r) => [r.id, mapLot(r)]));
  return ids.map((id) => byId.get(id)).filter((l): l is AuctionLot => !!l);
}
