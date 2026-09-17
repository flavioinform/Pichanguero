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

export interface TuttiValidation {
  valid: boolean;
  matchedName?: string;
}

/**
 * Checks a single free-text answer against the real data for a category's
 * rule + the round's letter. Every rule kind here maps to one of the
 * football tables already imported for Gato futbolero — see
 * tuttiCategories.ts for why purely subjective categories aren't included.
 */
export async function validateTuttiAnswer(rule: TuttiRule, letter: string, answer: string): Promise<TuttiValidation> {
  const trimmed = answer.trim();
  if (!trimmed || !startsWithLetter(trimmed, letter)) return { valid: false };

  const normalizedAnswer = normalize(trimmed);

  switch (rule.kind) {
    case 'player_name': {
      const { data, error } = await supabase.from('players').select('name').ilike('name', `${letter}%`).limit(500);
      if (error) throw new Error(error.message);
      const match = (data ?? []).find((p) => normalize(p.name) === normalizedAnswer);
      return match ? { valid: true, matchedName: match.name } : { valid: false };
    }

    case 'club_name': {
      const { data, error } = await supabase.from('clubs').select('name').ilike('name', `${letter}%`).limit(500);
      if (error) throw new Error(error.message);
      const match = (data ?? []).find((c) => normalize(c.name) === normalizedAnswer);
      return match ? { valid: true, matchedName: match.name } : { valid: false };
    }

    case 'coach_name': {
      const { data, error } = await supabase
        .from('clubs')
        .select('coach_name')
        .ilike('coach_name', `${letter}%`)
        .limit(500);
      if (error) throw new Error(error.message);
      const match = (data ?? []).find((c) => c.coach_name && normalize(c.coach_name) === normalizedAnswer);
      return match ? { valid: true, matchedName: match.coach_name! } : { valid: false };
    }

    case 'country': {
      const { data, error } = await supabase.from('countries').select('name').ilike('name', `${letter}%`).limit(200);
      if (error) throw new Error(error.message);
      const match = (data ?? []).find((c) => normalize(c.name) === normalizedAnswer);
      return match ? { valid: true, matchedName: match.name } : { valid: false };
    }

    case 'player_at_clubs': {
      const { data: clubPlayers, error: clubError } = await supabase
        .from('player_clubs')
        .select('player_id')
        .in('club_id', rule.clubIds);
      if (clubError) throw new Error(clubError.message);
      const playerIds = [...new Set((clubPlayers ?? []).map((r) => r.player_id))];
      if (playerIds.length === 0) return { valid: false };

      const { data, error } = await supabase
        .from('players')
        .select('name')
        .in('id', playerIds)
        .ilike('name', `${letter}%`);
      if (error) throw new Error(error.message);
      const match = (data ?? []).find((p) => normalize(p.name) === normalizedAnswer);
      return match ? { valid: true, matchedName: match.name } : { valid: false };
    }

    case 'player_position': {
      const { data, error } = await supabase
        .from('players')
        .select('name')
        .eq('position', rule.position)
        .ilike('name', `${letter}%`)
        .limit(500);
      if (error) throw new Error(error.message);
      const match = (data ?? []).find((p) => normalize(p.name) === normalizedAnswer);
      return match ? { valid: true, matchedName: match.name } : { valid: false };
    }

    case 'player_min_caps': {
      const { data, error } = await supabase
        .from('players')
        .select('name')
        .gte('international_caps', rule.minCaps)
        .ilike('name', `${letter}%`)
        .limit(500);
      if (error) throw new Error(error.message);
      const match = (data ?? []).find((p) => normalize(p.name) === normalizedAnswer);
      return match ? { valid: true, matchedName: match.name } : { valid: false };
    }
  }
}
