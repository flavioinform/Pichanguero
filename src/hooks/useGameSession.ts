import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { GatoSessionRow } from '../lib/gatoSession';

export interface GameTurnRow {
  id: string;
  session_id: string;
  player_id: string;
  row_index: number;
  col_index: number;
  answer: string;
  is_correct: boolean | null;
  created_at: string;
}

/**
 * Realtime sync for a single Gato futbolero session: loads the current
 * session + turns once, then keeps both in sync via Supabase Realtime so
 * both players see moves as they happen.
 */
export function useGameSession(sessionId: string | null) {
  const [session, setSession] = useState<GatoSessionRow | null>(null);
  const [turns, setTurns] = useState<GameTurnRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setSession(null);
      setTurns([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function loadInitial() {
      const [{ data: sessionRow }, { data: turnRows }] = await Promise.all([
        supabase.from('game_sessions').select('*').eq('id', sessionId).single(),
        supabase.from('game_turns').select('*').eq('session_id', sessionId).order('created_at'),
      ]);
      if (cancelled) return;
      setSession((sessionRow as GatoSessionRow) ?? null);
      setTurns((turnRows as GameTurnRow[]) ?? []);
      setLoading(false);
    }

    loadInitial();

    const channel = supabase
      .channel(`game_session:${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `id=eq.${sessionId}` },
        (payload) => setSession(payload.new as GatoSessionRow)
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'game_turns', filter: `session_id=eq.${sessionId}` },
        (payload) => setTurns((prev) => [...prev, payload.new as GameTurnRow])
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  return { session, turns, loading };
}
