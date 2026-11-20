import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { HeadSoccerSessionRow } from '../lib/headSoccerSession';
import { withTaps, type GameState, type Input, type InputTaps } from '../lib/headSoccer/types';
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
  const remoteStateRef = useRef<GameState | null>(null);
  const remoteTapsRef = useRef<InputTaps>({});
  const lastSentInputRef = useRef<Input | null>(null);
  const lastSentInputAtRef = useRef(0);
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
        const input = payload as Input;
        // a press and its release can arrive together: remember the press until a tick has used it
        if (input.jump) remoteTapsRef.current.jump = true;
        if (input.kick) remoteTapsRef.current.kick = true;
        remoteInputRef.current = input;
        lastHeardRef.current = Date.now();
      })
      .on('broadcast', { event: 'state' }, ({ payload }) => {
        remoteStateRef.current = payload as GameState;
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

  /** Called every physics tick, but only talks to the network when the input
   * changed (or as a periodic heartbeat): Realtime drops anything beyond its
   * per-second limit, and a held key doesn't need to be repeated 60 times. */
  function sendInput(input: Input) {
    const last = lastSentInputRef.current;
    const changed =
      !last || last.left !== input.left || last.right !== input.right || last.jump !== input.jump || last.kick !== input.kick;
    const nowMs = Date.now();
    if (!changed && nowMs - lastSentInputAtRef.current < HEAD_SOCCER_ONLINE.inputHeartbeatMs) return;
    lastSentInputRef.current = input;
    lastSentInputAtRef.current = nowMs;
    matchChannelRef.current?.send({ type: 'broadcast', event: 'input', payload: input });
  }

  /** Host only: the guest's keys for the next tick, including a tap that already ended. */
  function takeRemoteInput(): Input {
    const input = withTaps(remoteInputRef.current, remoteTapsRef.current);
    remoteTapsRef.current = {};
    return input;
  }

  /** The host's authoritative snapshot, for the guest to correct itself with. */
  function sendState(state: GameState) {
    matchChannelRef.current?.send({ type: 'broadcast', event: 'state', payload: state });
  }

  /** Latest snapshot received since the last call (or null). */
  function takeRemoteState(): GameState | null {
    const snapshot = remoteStateRef.current;
    remoteStateRef.current = null;
    return snapshot;
  }

  return { session, loading, takeRemoteInput, sendInput, sendState, takeRemoteState, connected };
}
