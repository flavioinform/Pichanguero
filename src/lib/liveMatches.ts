import { supabase } from './supabaseClient';

export interface LiveMatch {
  id: number;
  competition: string;
  competitionEmblem: string | null;
  homeTeam: string;
  homeCrest: string | null;
  awayTeam: string;
  awayCrest: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  minute: number | null;
  utcDate: string;
}

/** Calls the `live-matches` Edge Function (see supabase/functions/live-matches)
 * rather than football-data.org directly — that API has no CORS headers,
 * so a browser fetch would just be blocked regardless of the key. */
export async function getLiveMatches(): Promise<LiveMatch[]> {
  const { data, error } = await supabase.functions.invoke<{ matches: LiveMatch[]; error?: string }>('live-matches');
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data?.matches ?? [];
}
