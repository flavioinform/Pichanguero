import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { HeadSoccerSessionRow } from '../lib/headSoccerSession';
import type { Input } from '../lib/headSoccer/types';
import { HEAD_SOCCER_ONLINE } from '../config/gameConfig';

/** Realtime sync for a Head Soccer online room: lobby state (who joined,
 * countries, waiting/ready/playing/finished) over `postgres_changes`, plus —
 * once the match starts — a `broadcast` channel carrying only `Input`
 * objects per tick. The physics step is deterministic, so exchanging inputs
 * is enough to keep both clients' simulations in sync without ever sending
 * ball/player positions. */
export function useHeadSoccerSession(sessionId: string | null) {
  const [session, setSession] = useState<HeadSoccerSessionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const remoteInputRef = useRef<Input>({ left: false, right: false, jump: false, kick: false });
  const lastHeardRef = useRef(0);
  const matchChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setSession(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function loadInitial() {
      const { data } = await supabase.from('headsoccer_sessions').select('*').eq('id', sessionId).single();
      if (cancelled) return;
      setSession((data as HeadSoccerSessionRow) ?? null);
      setLoading(false);
    }

    loadInitial();

    const lobbyChannel = supabase
      .channel(`headsoccer_lobby:${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'headsoccer_sessions', filter: `id=eq.${sessionId}` },
        (payload) => setSession(payload.new as HeadSoccerSessionRow)
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(lobbyChannel);
    };
  }, [sessionId]);

  // Match input channel — only opened once both players are present and the
  // match is live, so both peers subscribe to the same channel name at
  // roughly the same time.
  useEffect(() => {
    if (!session || session.status !== 'playing' || !session.guest_id) return;

    const channel = supabase.channel(`headsoccer_match:${session.id}`);
    matchChannelRef.current = channel;
    lastHeardRef.current = Date.now();
    setConnected(true);

    channel
      .on('broadcast', { event: 'input' }, ({ payload }) => {
        remoteInputRef.current = payload as Input;
        lastHeardRef.current = Date.now();
      })
      .on('broadcast', { event: 'ping' }, () => {
        lastHeardRef.current = Date.now();
      })
      .subscribe();

    const pingTimer = setInterval(() => {
      channel.send({ type: 'broadcast', event: 'ping', payload: {} });
    }, HEAD_SOCCER_ONLINE.pingIntervalMs);

    const staleTimer = setInterval(() => {
      setConnected(Date.now() - lastHeardRef.current < HEAD_SOCCER_ONLINE.staleAfterMs);
    }, 1000);

    return () => {
      clearInterval(pingTimer);
      clearInterval(staleTimer);
      matchChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [session]);

  function sendInput(input: Input) {
    matchChannelRef.current?.send({ type: 'broadcast', event: 'input', payload: input });
  }

  return { session, loading, remoteInputRef, sendInput, connected };
}
