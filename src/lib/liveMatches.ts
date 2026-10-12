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

export interface LineupPlayer {
  name: string;
  position: string | null;
  shirtNumber: number | null;
  /** "row:col" pitch coordinate (API-FOOTBALL only) — null for lineups that
   * came from football-data.org instead, which don't include it. */
  grid: string | null;
}

export interface MatchDetail extends LiveMatch {
  halfTimeHome: number | null;
  halfTimeAway: number | null;
  venue: string | null;
  referee: string | null;
  matchday: number | null;
  stage: string | null;
  homeFormation: string | null;
  awayFormation: string | null;
  /** Lineups usually come back null on the free plan — the UI treats their
   * absence as normal, not an error. */
  homeLineup: LineupPlayer[] | null;
  awayLineup: LineupPlayer[] | null;
}

export async function getMatchDetail(matchId: number): Promise<MatchDetail> {
  const { data, error } = await supabase.functions.invoke<{ match: MatchDetail; error?: string }>('live-matches', {
    body: { matchId },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  if (!data?.match) throw new Error('No se encontró el partido.');
  return data.match;
}
