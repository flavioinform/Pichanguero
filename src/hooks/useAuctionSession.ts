import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type {
  AuctionSessionRow,
  AuctionPlayerRow,
  AuctionBidRow,
  AuctionResultRow,
} from '../lib/auctionSession';

/** Realtime sync for a Subasta futbolera room: session phase, roster with
 * budgets/scores, every bid placed and each round's recorded result. */
export function useAuctionSession(sessionId: string | null) {
  const [session, setSession] = useState<AuctionSessionRow | null>(null);
  const [players, setPlayers] = useState<AuctionPlayerRow[]>([]);
  const [bids, setBids] = useState<AuctionBidRow[]>([]);
  const [results, setResults] = useState<AuctionResultRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setSession(null);
      setPlayers([]);
      setBids([]);
      setResults([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function loadInitial() {
      const [{ data: sessionRow }, { data: playerRows }, { data: bidRows }, { data: resultRows }] = await Promise.all([
        supabase.from('auction_sessions').select('*').eq('id', sessionId).single(),
        supabase.from('auction_players').select('*').eq('session_id', sessionId).order('joined_at'),
        supabase.from('auction_bids').select('*').eq('session_id', sessionId),
        supabase.from('auction_results').select('*').eq('session_id', sessionId).order('round'),
      ]);
      if (cancelled) return;
      setSession((sessionRow as AuctionSessionRow) ?? null);
      setPlayers((playerRows as AuctionPlayerRow[]) ?? []);
      setBids((bidRows as AuctionBidRow[]) ?? []);
      setResults((resultRows as AuctionResultRow[]) ?? []);
      setLoading(false);
    }

    loadInitial();

    const channel = supabase
      .channel(`auction_session:${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'auction_sessions', filter: `id=eq.${sessionId}` },
        (payload) => setSession(payload.new as AuctionSessionRow)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'auction_players', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') return;
          const row = payload.new as AuctionPlayerRow;
          setPlayers((prev) => {
            const next = prev.filter((p) => p.id !== row.id);
            next.push(row);
            return next.sort((a, b) => a.joined_at.localeCompare(b.joined_at));
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'auction_bids', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const row = payload.new as AuctionBidRow;
          setBids((prev) => (prev.some((b) => b.id === row.id) ? prev : [...prev, row]));
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'auction_results', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const row = payload.new as AuctionResultRow;
          setResults((prev) => (prev.some((r) => r.id === row.id) ? prev : [...prev, row].sort((a, b) => a.round - b.round)));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  return { session, players, bids, results, loading };
}
