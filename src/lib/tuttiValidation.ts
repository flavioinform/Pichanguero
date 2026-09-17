import { supabase } from './supabaseClient';
import type { TuttiRule } from '../data/tuttiCategories';

const COMBINING_DIACRITICS = /[̀-ͯ]/g;

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(COMBINING_DIACRITICS, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function startsWithLetter(text: string, letter: string): boolean {
  return normalize(text).startsWith(normalize(letter));
}

/** Escapes ILIKE's own wildcard characters before using free-text user
 * input as part of a pattern we build ourselves. */
function escapeIlike(text: string): string {
  return text.replace(/[%_]/g, (m) => `\\${m}`);
}

export type InvalidReason = 'empty' | 'wrong_letter' | 'not_found';

export interface TuttiValidation {
  valid: boolean;
  matchedName?: string;
  reason?: InvalidReason;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyQuery = any;

/**
 * Looks up whether `answer` exists in `table.column`, optionally narrowed
 * by `applyFilters`. Two passes:
 *
 * 1. An exact ILIKE match on the whole answer — resolves instantly for a
 *    full-name answer that matches the stored value outright.
 * 2. A `%answer%` substring search, accepted only if `answer` matches one
 *    of the value's whole words exactly (so "Ana" can't wrongly match
 *    inside "Anastasia"). This is what makes surname-only answers work —
 *    "Messi" for the row "Lionel Messi" — which is how people naturally
 *    play this game.
 *
 * An earlier version filtered pass 2 by "value starts with the round's
 * letter" instead of a substring search. That's wrong for exactly this
 * surname case: "Lionel Messi" doesn't start with M, so it never even
 * became a candidate — independently of that version's other bug, a
 * 500-row cap on a filter matching thousands of rows for a common letter.
 * Real answers (Messi, Mourinho) were silently marked wrong by both bugs.
 */
async function findMatch(
  table: string,
  column: string,
  answer: string,
  applyFilters?: (query: AnyQuery) => AnyQuery
): Promise<{ name: string } | null> {
  let exactQuery: AnyQuery = supabase.from(table).select(column).ilike(column, escapeIlike(answer));
  if (applyFilters) exactQuery = applyFilters(exactQuery);
  const { data: exactData, error: exactError } = await exactQuery.limit(1);
  if (exactError) throw new Error(exactError.message);
  const exactRow: Record<string, string> | undefined = exactData?.[0];
  if (exactRow?.[column]) return { name: exactRow[column] };

  let containsQuery: AnyQuery = supabase.from(table).select(column).ilike(column, `%${escapeIlike(answer)}%`);
  if (applyFilters) containsQuery = applyFilters(containsQuery);
  const { data, error } = await containsQuery;
  if (error) throw new Error(error.message);

  // Padding both sides with a space turns this into a whole-word(s) match:
  // " ruud van nistelrooy ".includes(" van nistelrooy ") is true (the
  // multi-word surname case), but " anastasia ".includes(" ana ") is
  // false — a plain substring check would wrongly accept that one.
  const paddedAnswer = ` ${normalize(answer)} `;
  const rows: Record<string, string>[] = data ?? [];
  const match = rows.find((row) => row[column] && ` ${normalize(row[column])} `.includes(paddedAnswer));
  return match ? { name: match[column] } : null;
}

async function findMatchAmongIds(ids: number[], answer: string): Promise<{ name: string } | null> {
  if (ids.length === 0) return null;
  return findMatch('players', 'name', answer, (q) => q.in('id', ids));
}

/**
 * Validates a single free-text answer against the real data for a
 * category's rule + the round's letter. Every rule kind here maps to one
 * of the football tables already imported for Gato futbolero — see
 * tuttiCategories.ts for why purely subjective categories aren't included.
 */
export async function validateTuttiAnswer(rule: TuttiRule, letter: string, answer: string): Promise<TuttiValidation> {
  const trimmed = answer.trim();
  if (!trimmed) return { valid: false, reason: 'empty' };
  if (!startsWithLetter(trimmed, letter)) return { valid: false, reason: 'wrong_letter' };

  let match: { name: string } | null = null;

  switch (rule.kind) {
    case 'player_name':
      match = await findMatch('players', 'name', trimmed);
      break;

    case 'club_name':
      match = await findMatch('clubs', 'name', trimmed);
      break;

    case 'coach_name':
      match = await findMatch('clubs', 'coach_name', trimmed);
      break;

    case 'country':
      match = await findMatch('countries', 'name', trimmed);
      break;

    case 'player_position':
      match = await findMatch('players', 'name', trimmed, (q) => q.eq('position', rule.position));
      break;

    case 'player_min_caps':
      match = await findMatch('players', 'name', trimmed, (q) => q.gte('international_caps', rule.minCaps));
      break;

    case 'player_at_clubs': {
      const { data: clubPlayers, error: clubError } = await supabase
        .from('player_clubs')
        .select('player_id')
        .in('club_id', rule.clubIds);
      if (clubError) throw new Error(clubError.message);
      const playerIds = [...new Set((clubPlayers ?? []).map((r) => r.player_id))];
      match = await findMatchAmongIds(playerIds, trimmed);
      break;
    }
  }

  if (!match) return { valid: false, reason: 'not_found' };
  return { valid: true, matchedName: match.name };
}
