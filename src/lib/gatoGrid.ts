import { supabase } from './supabaseClient';
import { clubPoolForDifficulty, countryPoolForDifficulty, CLUB_COMPATIBLE_COUNTRIES, type Difficulty } from '../data/gatoPools';

export type { Difficulty };

export interface GridCriterion {
  kind: 'club' | 'country';
  id: string;
  label: string;
}

export interface GatoGrid {
  rowCriteria: [GridCriterion, GridCriterion, GridCriterion];
  colCriteria: [GridCriterion, GridCriterion, GridCriterion];
}

/** A cell that resists this many total attempts (correct or not, from
 * either player) closes unclaimed instead of bouncing forever — keeps a
 * match always finishable even if neither player knows a crossing. Shared
 * between the board UI (which cells are still selectable) and the
 * session/offline "is the match over" checks, so they never disagree. */
export const MAX_ATTEMPTS_PER_CELL = 6;

export interface CellAttempt {
  row: number;
  col: number;
  correct: boolean;
}

/** Cell keys ("row:col") that are no longer playable — either correctly
 * answered, or given up on after MAX_ATTEMPTS_PER_CELL failed attempts. */
export function getClosedGatoCellKeys(attempts: CellAttempt[]): Set<string> {
  const closed = new Set<string>();
  const attemptCounts = new Map<string, number>();

  for (const a of attempts) {
    const key = `${a.row}:${a.col}`;
    attemptCounts.set(key, (attemptCounts.get(key) ?? 0) + 1);
    if (a.correct) closed.add(key);
  }
  for (const [key, count] of attemptCounts) {
    if (count >= MAX_ATTEMPTS_PER_CELL) closed.add(key);
  }

  return closed;
}

/** True once every one of the 9 cells is closed (see getClosedGatoCellKeys). */
export function isGatoBoardFinished(attempts: CellAttempt[]): boolean {
  return getClosedGatoCellKeys(attempts).size >= 9;
}

function pickRandom<T>(pool: T[], count: number): T[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function clubCriterion(clubId: number, name: string): GridCriterion {
  return { kind: 'club', id: String(clubId), label: name };
}

function countryCriterion(name: string): GridCriterion {
  return { kind: 'country', id: name, label: name };
}

export interface CellCandidate {
  id: number;
  name: string;
}

/**
 * All real players satisfying both a club (row) and country (column)
 * criterion — used for grid validation, free-text answer checking, and the
 * CPU opponent's picks. `limit` keeps the grid-generation existence check
 * cheap since it runs up to 9×MAX_ATTEMPTS times.
 */
export async function getCellCandidates(
  rowCriterion: GridCriterion,
  colCriterion: GridCriterion,
  limit?: number
): Promise<CellCandidate[]> {
  const club = rowCriterion.kind === 'club' ? rowCriterion : colCriterion;
  const country = rowCriterion.kind === 'country' ? rowCriterion : colCriterion;

  // player_clubs is a plain UNION view (current club + transfer history),
  // not FK-backed, so it isn't embeddable via PostgREST's `table!inner(...)`
  // — resolve the player ids for the club first, then filter players.
  const { data: clubPlayers, error: clubError } = await supabase
    .from('player_clubs')
    .select('player_id')
    .eq('club_id', Number(club.id));
  if (clubError) throw new Error(clubError.message);

  const playerIds = [...new Set((clubPlayers ?? []).map((r) => r.player_id))];
  if (playerIds.length === 0) return [];

  let query = supabase
    .from('players')
    .select('id, name')
    .in('id', playerIds)
    .eq('country_of_citizenship', country.id)
    .gt('international_caps', 0);

  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

const MAX_ATTEMPTS = 200;

/**
 * Picks 3 clubs (rows) and 3 countries (columns) so every one of the 9
 * crossings has at least one valid answer. Uses CLUB_COMPATIBLE_COUNTRIES
 * (precomputed offline from the real data — see gatoPools.ts) instead of
 * live queries: picking 3 random countries first and then finding clubs
 * compatible with all three is instant and needs no network round-trip.
 * A naive "pick everything randomly, then validate all 9 live" approach
 * was tried first and abandoned — per-cell hit rate is only ~30-50% even
 * with curated pools, so the odds of a fully random 3x3 all landing are
 * near zero; this file's matrix sidesteps that instead of brute-forcing it.
 */
export async function generateGatoGrid(difficulty: Difficulty = 'hard'): Promise<GatoGrid> {
  const clubPool = clubPoolForDifficulty(difficulty);
  const countryPool = countryPoolForDifficulty(difficulty);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const countries = pickRandom(countryPool, 3);
    const compatibleClubs = clubPool.filter((club) =>
      countries.every((country) => CLUB_COMPATIBLE_COUNTRIES[club.id]?.includes(country))
    );

    if (compatibleClubs.length >= 3) {
      const clubs = pickRandom(compatibleClubs, 3).map((c) => clubCriterion(c.id, c.name));
      return {
        rowCriteria: clubs as GatoGrid['rowCriteria'],
        colCriteria: countries.map(countryCriterion) as GatoGrid['colCriteria'],
      };
    }
  }

  throw new Error('No se pudo generar una grilla válida. Intentá de nuevo.');
}

export interface AnswerCheck {
  correct: boolean;
  matchedPlayerId?: number;
  matchedPlayerName?: string;
}

const COMBINING_DIACRITICS = /[̀-ͯ]/g;

function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(COMBINING_DIACRITICS, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Validates a free-text answer against the real players matching both the
 * row (club) and column (country) criteria for a cell.
 */
export async function checkGatoAnswer(
  answer: string,
  rowCriterion: GridCriterion,
  colCriterion: GridCriterion
): Promise<AnswerCheck> {
  const candidates = await getCellCandidates(rowCriterion, colCriterion);
  const normalizedAnswer = normalizeName(answer);
  const match = candidates.find((p) => normalizeName(p.name) === normalizedAnswer);

  if (!match) return { correct: false };
  return { correct: true, matchedPlayerId: match.id, matchedPlayerName: match.name };
}
