import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { TuttiSessionRow, TuttiPlayerRow, TuttiAnswerRow } from '../lib/tuttiSession';

/**
 * Realtime sync for a Tutti frutti room: session config/status, the player
 * roster (up to 4), and the current match's answers — loads once, then
 * keeps all three in sync via Supabase Realtime.
 */
export function useTuttiSession(sessionId: string | null) {
  const [session, setSession] = useState<TuttiSessionRow | null>(null);
  const [players, setPlayers] = useState<TuttiPlayerRow[]>([]);
  const [answers, setAnswers] = useState<TuttiAnswerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setSession(null);
      setPlayers([]);
      setAnswers([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function loadInitial() {
      const [{ data: sessionRow }, { data: playerRows }, { data: answerRows }] = await Promise.all([
        supabase.from('tutti_sessions').select('*').eq('id', sessionId).single(),
        supabase.from('tutti_players').select('*').eq('session_id', sessionId).order('joined_at'),
        supabase.from('tutti_answers').select('*').eq('session_id', sessionId),
      ]);
      if (cancelled) return;
      setSession((sessionRow as TuttiSessionRow) ?? null);
      setPlayers((playerRows as TuttiPlayerRow[]) ?? []);
      setAnswers((answerRows as TuttiAnswerRow[]) ?? []);
      setLoading(false);
    }

    loadInitial();

    const channel = supabase
      .channel(`tutti_session:${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tutti_sessions', filter: `id=eq.${sessionId}` },
        (payload) => setSession(payload.new as TuttiSessionRow)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tutti_players', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') return;
          const row = payload.new as TuttiPlayerRow;
          setPlayers((prev) => {
            const next = prev.filter((p) => p.id !== row.id);
            next.push(row);
            return next.sort((a, b) => a.joined_at.localeCompare(b.joined_at));
          });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tutti_answers', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') return;
          const row = payload.new as TuttiAnswerRow;
          setAnswers((prev) => {
            const next = prev.filter((a) => a.id !== row.id);
            next.push(row);
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  return { session, players, answers, loading };
}
