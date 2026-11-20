import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { StreetSessionRow } from '../lib/streetSession';
import { emptyStreetInput, TAP_KEYS, withTaps, type StreetInput, type Taps } from '../lib/street/engine';
import type { StreetSnapshot } from '../lib/street/netSync';
import { STREET_ONLINE } from '../config/gameConfig';

/** Realtime sync for a Fútbol callejero online room. The lobby (who joined,
 * countries, waiting/ready/playing) comes over `postgres_changes`; the match
 * goes over a `broadcast` channel: the guest sends the keys they hold, the
 * host sends snapshots of the whole match. Nothing of the match is written
 * to the database. */
export function useStreetSession(sessionId: string | null) {
  const [session, setSession] = useState<StreetSessionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const remoteInputRef = useRef<StreetInput>(emptyStreetInput());
  const remoteTapsRef = useRef<Taps>({});
  const remoteSnapshotRef = useRef<StreetSnapshot | null>(null);
  const lastSentInputRef = useRef('');
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

    supabase
      .from('street_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        setSession((data as StreetSessionRow) ?? null);
        setLoading(false);
      });

    const lobbyChannel = supabase
      .channel(`street_lobby:${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'street_sessions', filter: `id=eq.${sessionId}` },
        (payload) => setSession(payload.new as StreetSessionRow)
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(lobbyChannel);
    };
  }, [sessionId]);

  const playingId = session && session.status === 'playing' && session.guest_id ? session.id : null;

  // Match channel: only opened once both players are in and the match is live.
  useEffect(() => {
    if (!playingId) return;

    const channel = supabase.channel(`street_match:${playingId}`);
    matchChannelRef.current = channel;
    lastHeardRef.current = Date.now();
    setConnected(true);

    channel
      .on('broadcast', { event: 'input' }, ({ payload }) => {
        const input = payload as StreetInput;
        // a press and its release can arrive together: remember the press until a tick has used it
        for (const key of TAP_KEYS) if (input[key]) remoteTapsRef.current[key] = true;
        remoteInputRef.current = input;
        lastHeardRef.current = Date.now();
      })
      .on('broadcast', { event: 'state' }, ({ payload }) => {
        remoteSnapshotRef.current = payload as StreetSnapshot;
        lastHeardRef.current = Date.now();
      })
      .on('broadcast', { event: 'ping' }, () => {
        lastHeardRef.current = Date.now();
      })
      .subscribe();

    const pingTimer = setInterval(() => {
      channel.send({ type: 'broadcast', event: 'ping', payload: {} });
    }, STREET_ONLINE.pingIntervalMs);
    const staleTimer = setInterval(() => {
      setConnected(Date.now() - lastHeardRef.current < STREET_ONLINE.staleAfterMs);
    }, 1000);

    return () => {
      clearInterval(pingTimer);
      clearInterval(staleTimer);
      matchChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [playingId]);

  /** Called every tick, but only talks to the network when the keys changed
   * (or as a heartbeat): Realtime drops anything beyond its per-second limit. */
  function sendInput(input: StreetInput) {
    const encoded = JSON.stringify(input);
    const nowMs = Date.now();
    if (encoded === lastSentInputRef.current && nowMs - lastSentInputAtRef.current < STREET_ONLINE.inputHeartbeatMs) return;
    lastSentInputRef.current = encoded;
    lastSentInputAtRef.current = nowMs;
    matchChannelRef.current?.send({ type: 'broadcast', event: 'input', payload: input });
  }

  /** Host only: the guest's keys for the next tick, including any tap that already ended. */
  function takeRemoteInput(): StreetInput {
    const input = withTaps(remoteInputRef.current, remoteTapsRef.current);
    remoteTapsRef.current = {};
    return input;
  }

  /** Host only: the authoritative snapshot. */
  function sendSnapshot(snapshot: StreetSnapshot) {
    matchChannelRef.current?.send({ type: 'broadcast', event: 'state', payload: snapshot });
  }

  /** Guest only: the newest snapshot since the last call (or null). */
  function takeSnapshot(): StreetSnapshot | null {
    const snapshot = remoteSnapshotRef.current;
    remoteSnapshotRef.current = null;
    return snapshot;
  }

  return { session, loading, takeRemoteInput, sendInput, sendSnapshot, takeSnapshot, connected };
}
