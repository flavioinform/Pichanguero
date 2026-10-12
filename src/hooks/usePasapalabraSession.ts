import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { PasapalabraSessionRow, PasapalabraPlayerRow } from '../lib/pasapalabraSession';

/** Realtime sync for an online Pasapalabra room: the session (status, shared
 * rosco, start time) and the roster with each player's live progress. */
export function usePasapalabraSession(sessionId: string | null) {
  const [session, setSession] = useState<PasapalabraSessionRow | null>(null);
  const [players, setPlayers] = useState<PasapalabraPlayerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setSession(null);
      setPlayers([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function loadInitial() {
      const [{ data: sessionRow }, { data: playerRows }] = await Promise.all([
        supabase.from('pasapalabra_sessions').select('*').eq('id', sessionId).single(),
        supabase.from('pasapalabra_players').select('*').eq('session_id', sessionId).order('joined_at'),
      ]);
      if (cancelled) return;
      setSession((sessionRow as PasapalabraSessionRow) ?? null);
      setPlayers((playerRows as PasapalabraPlayerRow[]) ?? []);
      setLoading(false);
    }

    loadInitial();

    const channel = supabase
      .channel(`pasapalabra_session:${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pasapalabra_sessions', filter: `id=eq.${sessionId}` },
        (payload) => setSession(payload.new as PasapalabraSessionRow)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pasapalabra_players', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') return;
          const row = payload.new as PasapalabraPlayerRow;
          setPlayers((prev) => {
            const next = prev.filter((p) => p.id !== row.id);
            next.push(row);
            return next.sort((a, b) => a.joined_at.localeCompare(b.joined_at));
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  return { session, players, loading };
}
