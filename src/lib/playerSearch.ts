import { supabase } from './supabaseClient';

export interface PlayerSuggestion {
  id: number;
  name: string;
}

/**
 * Free-text player name search across the whole dataset (not scoped to a
 * grid cell's criteria) — used by the answer autocomplete so users can only
 * submit names that exist in the data, whether or not they're correct for
 * the cell they're answering.
 */
export async function searchPlayers(query: string, limit = 8): Promise<PlayerSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const { data, error } = await supabase
    .from('players')
    .select('id, name')
    .ilike('name', `%${trimmed}%`)
    .order('international_caps', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}
