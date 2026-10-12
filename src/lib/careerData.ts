import { supabase } from './supabaseClient';
import type { ClubOfferOption, PositionCode } from './careerTypes';

const SUB_POSITION_BY_CODE: Record<PositionCode, string> = {
  POR: 'Goalkeeper',
  DFC: 'Centre-Back',
  LI: 'Left-Back',
  LD: 'Right-Back',
  MCD: 'Defensive Midfield',
  MC: 'Central Midfield',
  MI: 'Left Midfield',
  MD: 'Right Midfield',
  MCO: 'Attacking Midfield',
  EI: 'Left Winger',
  ED: 'Right Winger',
  DC: 'Centre-Forward',
};

export interface CountryOption {
  id: number;
  name: string;
  code: string | null;
}

export async function fetchCountries(): Promise<CountryOption[]> {
  const { data, error } = await supabase.from('countries').select('id, name, code').order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

interface ClubRow {
  id: number;
  name: string;
  competitions: { name: string; country_name: string | null } | null;
}

/** Clubs playing in the given country's competitions, for club-offer pools.
 * Falls back to a broader random sample when a country has too few clubs
 * (common for smaller football nations in the imported dataset). */
export async function fetchClubsByCountry(countryName: string, limit = 24): Promise<ClubOfferOption[]> {
  // `!inner` is required here: without it PostgREST left-joins and only
  // filters the embedded `competitions` object, not which club ROWS come
  // back — `.limit(24)` would then grab 24 arbitrary clubs (mostly with a
  // null `competitions`, from any country) before the country filter ever
  // gets applied, which is why offers used to show up from the wrong country.
  const { data, error } = await supabase
    .from('clubs')
    .select('id, name, competitions!inner(name, country_name)')
    .eq('competitions.country_name', countryName)
    .limit(limit);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as ClubRow[];
  if (rows.length >= 3) return rows.map(mapClubRow);

  const { data: fallback, error: fallbackError } = await supabase
    .from('clubs')
    .select('id, name, competitions(name, country_name)')
    .limit(limit);
  if (fallbackError) throw new Error(fallbackError.message);
  return ((fallback ?? []) as unknown as ClubRow[]).map(mapClubRow);
}

/** Picks one real player's `image_url` in the same position — and, when
 * enough candidates exist, the same nationality — to use as a one-time
 * stand-in portrait for a created career player. Never re-rolled afterward:
 * the caller stores the result on `CareerPlayerState.avatarImageUrl`. */
export async function fetchAvatarCandidate(position: PositionCode, nationalityName: string): Promise<string | null> {
  const subPosition = SUB_POSITION_BY_CODE[position];
  const pickFrom = async (filters: { subPosition?: string; country?: string }) => {
    let query = supabase.from('players').select('image_url').not('image_url', 'is', null).limit(40);
    if (filters.subPosition) query = query.eq('sub_position', filters.subPosition);
    if (filters.country) query = query.eq('country_of_citizenship', filters.country);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as { image_url: string }[];
  };

  const nationalMatch = await pickFrom({ subPosition, country: nationalityName });
  const pool = nationalMatch.length >= 3 ? nationalMatch : await pickFrom({ subPosition });
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)].image_url;
}

/** Same idea as `fetchAvatarCandidate` but without a position filter — used
 * for Head Soccer, where characters only have a nationality, not a position.
 * Picks a real player's photo from that country (falling back to any
 * country if too few candidates) as the character's "head". */
export async function fetchRandomPlayerPhoto(nationalityName: string): Promise<string | null> {
  const pickFrom = async (country?: string) => {
    let query = supabase.from('players').select('image_url').not('image_url', 'is', null).limit(40);
    if (country) query = query.eq('country_of_citizenship', country);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as { image_url: string }[];
  };

  const nationalMatch = await pickFrom(nationalityName);
  const pool = nationalMatch.length >= 3 ? nationalMatch : await pickFrom();
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)].image_url;
}

function mapClubRow(row: ClubRow): ClubOfferOption {
  return {
    clubId: row.id,
    clubName: row.name,
    competitionName: row.competitions?.name ? slugToTitle(row.competitions.name) : null,
    countryName: row.competitions?.country_name ?? null,
  };
}

const SLUG_ACRONYMS: Record<string, string> = { uefa: 'UEFA', fa: 'FA', dfb: 'DFB', fifa: 'FIFA', afc: 'AFC' };

/** `competitions.name` is stored as a URL slug (e.g. "premier-league",
 * "uefa-champions-league") — this turns it into a readable display name. */
function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map((word) => SLUG_ACRONYMS[word] ?? word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export interface CompetitionContext {
  /** Real domestic cup name for the nationality's country (e.g. "FA Cup",
   * "DFB Pokal"), or null when the imported dataset has none for it. */
  domesticCupName: string | null;
  /** Real UEFA club competition names, only populated for European
   * nationalities — the dataset has no continental club competition data
   * for other confederations (no Copa Libertadores, AFC Champions League,
   * etc.), so trophies for those stay league/domestic-cup only rather than
   * naming a continental cup that isn't backed by real data. */
  continentalCupNames: string[];
}

/** Fetched once per nationality (alongside the club pool) so trophy events
 * can name a real competition instead of a generic "Liga"/"Copa". */
export async function fetchCompetitionContext(countryName: string): Promise<CompetitionContext> {
  const [cupResult, countryResult] = await Promise.all([
    supabase.from('competitions').select('name').eq('country_name', countryName).eq('competition_type', 'domestic_cup').limit(1),
    supabase.from('countries').select('confederation').eq('name', countryName).limit(1),
  ]);
  if (cupResult.error) throw new Error(cupResult.error.message);
  if (countryResult.error) throw new Error(countryResult.error.message);

  const domesticCupName = cupResult.data?.[0] ? slugToTitle(cupResult.data[0].name) : null;
  const confederation = (countryResult.data?.[0] as { confederation: string | null } | undefined)?.confederation ?? null;

  let continentalCupNames: string[] = [];
  if (confederation === 'UEFA') {
    const { data, error } = await supabase
      .from('competitions')
      .select('name')
      .eq('competition_type', 'international_cup')
      .not('name', 'ilike', '%qualifying%');
    if (error) throw new Error(error.message);
    continentalCupNames = (data ?? []).map((r) => slugToTitle(r.name));
  }

  return { domesticCupName, continentalCupNames };
}
