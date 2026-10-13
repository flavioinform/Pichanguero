import { useEffect, useMemo, useRef, useState } from 'react';
import { colors, fonts } from '../../theme';
import { useAuth } from '../../hooks/useAuth';
import { useAuctionSession } from '../../hooks/useAuctionSession';
import {
  advanceAuction,
  bidRowToBid,
  createAuctionSession,
  finalizeAuctionRound,
  joinAuctionSession,
  placeAuctionBid,
  startAuction,
} from '../../lib/auctionSession';
import { fetchAuctionLotsByIds } from '../../lib/auctionData';
import { highestBid, type AuctionBid, type AuctionLot } from '../../lib/auctionEngine';
import { DEFAULT_FORMATION_ID, assignToXi, getFormation, hasFreeSlot, type Xi } from '../../lib/auctionFormations';
import { AuctionBoard, type BoardBid, type BoardReveal } from './AuctionBoard';
import { AuctionResult } from './AuctionResult';
import { AuctionSettings } from './AuctionSettings';
import {
  CenteredCard,
  CenteredMessage,
  ErrorText,
  PrimaryButton,
  SecondaryButton,
  SectionLabel,
  TextInput,
  Title,
} from './auctionUi';
import { AUCTION } from '../../config/gameConfig';

const TICK_MS = 250;

interface AuctionOnlineScreenProps {
  onBack: () => void;
}

type View = 'choose' | 'config' | 'join';

export function AuctionOnlineScreen({ onBack }: AuctionOnlineScreenProps) {
  const { userId, nickname, loading: authLoading, setNickname } = useAuth();
  const [view, setView] = useState<View>('choose');
  const [nicknameInput, setNicknameInput] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [budget, setBudget] = useState(AUCTION.defaultBudget);
  const [formationId, setFormationId] = useState(DEFAULT_FORMATION_ID);
  const [lotsMode, setLotsMode] = useState<'full' | 'short'>('full');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [bidError, setBidError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [lotsById, setLotsById] = useState<Record<number, AuctionLot>>({});

  const { session, players, bids, results, loading: sessionLoading } = useAuctionSession(sessionId);
  const finalizedRound = useRef<number | null>(null);
  const advancedRound = useRef<number | null>(null);
  const revealSeenAt = useRef<number>(0);

  const status = session?.status;
  const round = session?.current_round ?? 0;
  const isHost = !!session && session.host_id === userId;
  const lotId = session && round > 0 ? session.lot_player_ids[round - 1] : undefined;
  const formation = getFormation(session?.formation ?? formationId);

  useEffect(() => {
    if (status !== 'bidding' && status !== 'reveal') return;
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, [status]);

  // Loads the lot on the block plus every lot already won (to fill the XIs).
  // Future lots are never fetched, so they stay hidden until their round.
  useEffect(() => {
    const wanted = [...(lotId ? [lotId] : []), ...results.map((r) => r.lot_player_id)];
    const missing = [...new Set(wanted)].filter((id) => !lotsById[id]);
    if (missing.length === 0) return;
    let cancelled = false;
    fetchAuctionLotsByIds(missing)
      .then((lots) => {
        if (cancelled) return;
        setLotsById((prev) => ({ ...prev, ...Object.fromEntries(lots.map((l) => [l.id, l])) }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [lotId, results, lotsById]);

  const currentLot = lotId ? (lotsById[lotId] ?? null) : null;
  const roundStartMs = session?.round_started_at ? Date.parse(session.round_started_at) : 0;
  const elapsedMs = status === 'bidding' ? now - roundStartMs : AUCTION.bidWindowMs;

  // Host closes the bidding window once it ends.
  useEffect(() => {
    if (!isHost || !session || status !== 'bidding') return;
    if (now - roundStartMs < AUCTION.bidWindowMs + AUCTION.finalizeGraceMs) return;
    if (finalizedRound.current === round) return;
    finalizedRound.current = round;
    finalizeAuctionRound(session).catch((err) => setErrorMsg(err instanceof Error ? err.message : 'No se pudo cerrar la ronda.'));
  }, [isHost, session, status, now, roundStartMs, round]);

  // Host moves on after the reveal has been on screen for a while.
  useEffect(() => {
    if (status !== 'reveal') {
      revealSeenAt.current = 0;
      return;
    }
    if (!revealSeenAt.current) revealSeenAt.current = Date.now();
    if (!isHost || !session) return;
    if (now - revealSeenAt.current < AUCTION.revealMs) return;
    if (advancedRound.current === round) return;
    advancedRound.current = round;
    advanceAuction(session).catch((err) => setErrorMsg(err instanceof Error ? err.message : 'No se pudo avanzar.'));
  }, [isHost, session, status, now, round]);

  const nameOf = (playerId: string) => players.find((p) => p.player_id === playerId)?.nickname ?? '—';
  const me = players.find((p) => p.player_id === userId);

  const roundBids: AuctionBid[] = useMemo(
    () => bids.filter((b) => b.round === round).map(bidRowToBid),
    [bids, round]
  );

  // Each player's XI, rebuilt from the recorded results in round order so
  // every client puts the same player in the same slot.
  const xis = useMemo(() => {
    const out: Record<string, Xi> = {};
    for (const p of players) out[p.player_id] = {};
    for (const r of [...results].sort((a, b) => a.round - b.round)) {
      const lot = lotsById[r.lot_player_id];
      if (r.winner_id && lot && out[r.winner_id]) out[r.winner_id] = assignToXi(formation, out[r.winner_id], lot);
    }
    return out;
  }, [players, results, lotsById, formation]);

  const [bidAlert, setBidAlert] = useState<string | null>(null);
  const lastBidId = useRef<string | null>(null);
  useEffect(() => {
    const roundRows = bids.filter((b) => b.round === round);
    const latest = roundRows[roundRows.length - 1];
    if (!latest || latest.id === lastBidId.current) return;
    lastBidId.current = latest.id;
    setBidAlert(`${nameOf(latest.player_id)} pujó ${latest.amount}M`);
    const timeout = setTimeout(() => setBidAlert(null), 3000);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bids, round, players]);

  if (authLoading) return <CenteredMessage text="Conectando…" />;

  if (!nickname) {
    return (
      <CenteredCard>
        <Title>¿Cómo te llamás?</Title>
        <TextInput
          value={nicknameInput}
          onChange={setNicknameInput}
          placeholder="Tu apodo"
          onEnter={() => nicknameInput.trim() && setNickname(nicknameInput.trim())}
        />
        <PrimaryButton label="Continuar" disabled={!nicknameInput.trim()} onClick={() => setNickname(nicknameInput.trim())} />
      </CenteredCard>
    );
  }

  async function handleCreate() {
    setBusy(true);
    setErrorMsg(null);
    try {
      const created = await createAuctionSession(nickname!, { budget, formation: formationId, lotsMode });
      setSessionId(created.id);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo crear la sala.');
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin() {
    if (!joinCodeInput.trim()) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      const joined = await joinAuctionSession(joinCodeInput.trim(), nickname!);
      setSessionId(joined.id);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo unir a la sala.');
    } finally {
      setBusy(false);
    }
  }

  async function handleStart() {
    if (!session) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      await startAuction(session);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo iniciar la subasta.');
    } finally {
      setBusy(false);
    }
  }

  async function handleBid(amount: number) {
    if (!session || !me) return;
    setBidError(null);
    try {
      await placeAuctionBid(session, amount, me.budget_left, roundBids);
    } catch (err) {
      setBidError(err instanceof Error ? err.message : 'No se pudo pujar.');
    }
  }

  function handlePlayAgain() {
    setSessionId(null);
    setJoinCodeInput('');
    setErrorMsg(null);
    setLotsById({});
    finalizedRound.current = null;
    advancedRound.current = null;
    setView('choose');
  }

  if (sessionId && (sessionLoading || !session)) return <CenteredMessage text="Cargando sala…" />;

  if (session && userId) {
    if (session.status === 'finished') {
      return (
        <CenteredCard wide>
          <Title>Los onces finales</Title>
          <AuctionResult
            formation={formation}
            standings={players.map((p) => ({
              key: p.player_id,
              label: p.nickname,
              mine: p.player_id === userId,
              score: p.score,
              budgetLeft: p.budget_left,
              xi: xis[p.player_id] ?? {},
            }))}
          />
          <div style={{ display: 'flex', gap: 12 }}>
            <PrimaryButton label="Jugar de nuevo" onClick={handlePlayAgain} />
            <SecondaryButton label="Volver al menú" onClick={onBack} />
          </div>
        </CenteredCard>
      );
    }

    if (session.status === 'bidding' || session.status === 'reveal') {
      const top = highestBid(roundBids);
      const toBoardBid = (b: AuctionBid): BoardBid => ({ label: nameOf(b.playerKey), amount: b.amount, mine: b.playerKey === userId });
      const result = results.find((r) => r.round === round);
      const reveal: BoardReveal | null =
        session.status === 'reveal' && result
          ? {
              winnerLabel: result.winner_id ? nameOf(result.winner_id) : null,
              winnerMine: result.winner_id === userId,
              price: result.price,
              caps: result.caps,
            }
          : null;
      const revealLeft = Math.max(0, Math.ceil((AUCTION.revealMs - (now - (revealSeenAt.current || now))) / 1000));

      return (
        <div style={{ position: 'relative', zIndex: 2, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'safe center', overflowY: 'auto', gap: 8 }}>
          {bidAlert && session.status === 'bidding' && (
            <div
              role="status"
              style={{
                position: 'absolute',
                top: 16,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 5,
                padding: '10px 22px',
                background: 'rgba(224,193,90,0.95)',
                color: '#0a0a0c',
                fontWeight: 800,
                fontSize: 15,
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                boxShadow: '0 0 24px rgba(224,193,90,0.5)',
              }}
            >
              ⚡ {bidAlert}
            </div>
          )}
          <AuctionBoard
            phase={session.status}
            round={round}
            roundsTotal={session.rounds_total}
            lot={currentLot}
            formation={formation}
            elapsedMs={elapsedMs}
            topBid={top ? toBoardBid(top) : null}
            recentBids={[...roundBids].sort((a, b) => b.at - a.at).slice(0, 4).map(toBoardBid)}
            myBudget={me?.budget_left ?? 0}
            budgetTotal={session.budget}
            hasSlot={hasFreeSlot(formation, xis[userId] ?? {}, currentLot)}
            standings={players.map((p) => ({
              key: p.player_id,
              label: p.nickname,
              mine: p.player_id === userId,
              budgetLeft: p.budget_left,
              score: p.score,
              xi: xis[p.player_id] ?? {},
            }))}
            onBid={handleBid}
            bidError={bidError}
            reveal={reveal}
            revealCountdown={isHost ? revealLeft : null}
            onNext={isHost && session ? () => advanceAuction(session).catch(() => {}) : null}
            onExit={onBack}
          />
          {errorMsg && <ErrorText text={errorMsg} />}
        </div>
      );
    }

    return (
      <CenteredCard>
        <Title>Sala de espera</Title>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>Código para invitar</span>
          <div
            style={{
              fontFamily: fonts.display,
              fontSize: 'clamp(26px, 9vw, 36px)',
              letterSpacing: 6,
              color: colors.accentLight,
              border: `2px solid ${colors.accent}`,
              padding: '10px 24px',
            }}
          >
            {session.join_code}
          </div>
          <span style={{ fontSize: 13, color: colors.textSecondary }}>
            {session.formation} · {session.budget}M de presupuesto · {session.lots_mode === 'full' ? 'once completo' : 'rápida'}
          </span>
        </div>

        <SectionLabel>
          Jugadores ({players.length}/{session.max_players})
        </SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
          {players.map((p) => (
            <div
              key={p.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 16px',
                background: 'rgba(18,18,20,0.5)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              <span>{p.nickname}</span>
              {p.player_id === session.host_id && (
                <span style={{ color: colors.accentLight, fontSize: 12, textTransform: 'uppercase' }}>Host 👑</span>
              )}
            </div>
          ))}
        </div>

        {isHost ? (
          <>
            <PrimaryButton
              label={busy ? 'Buscando jugadores…' : 'Arrancar subasta'}
              disabled={busy || players.length < 2}
              onClick={handleStart}
            />
            {players.length < 2 && <div style={{ fontSize: 12, color: colors.textMuted }}>Esperando al menos otro jugador…</div>}
          </>
        ) : (
          <div style={{ color: colors.textSecondary, fontSize: 14 }}>
            Esperando a que {nameOf(session.host_id)} inicie la subasta…
          </div>
        )}

        {errorMsg && <ErrorText text={errorMsg} />}
        <SecondaryButton label="Salir" onClick={onBack} />
      </CenteredCard>
    );
  }

  if (view === 'config') {
    return (
      <CenteredCard wide>
        <Title>Configurar sala</Title>
        <AuctionSettings
          budget={budget}
          formationId={formationId}
          lotsMode={lotsMode}
          participants={3}
          onBudgetChange={setBudget}
          onFormationChange={setFormationId}
          onLotsModeChange={setLotsMode}
        />
        {errorMsg && <ErrorText text={errorMsg} />}
        <PrimaryButton label={busy ? 'Creando…' : 'Crear sala'} disabled={busy} onClick={handleCreate} />
        <SecondaryButton label="Volver" onClick={() => setView('choose')} />
      </CenteredCard>
    );
  }

  if (view === 'join') {
    return (
      <CenteredCard>
        <Title>Unirse a sala</Title>
        <TextInput
          value={joinCodeInput}
          onChange={(v) => setJoinCodeInput(v.toUpperCase())}
          placeholder="Código de 6 letras"
          onEnter={handleJoin}
        />
        {errorMsg && <ErrorText text={errorMsg} />}
        <PrimaryButton label={busy ? 'Uniendo…' : 'Unirse'} disabled={busy || !joinCodeInput.trim()} onClick={handleJoin} />
        <SecondaryButton label="Volver" onClick={() => setView('choose')} />
      </CenteredCard>
    );
  }

  return (
    <CenteredCard>
      <Title>Subasta online</Title>
      <p style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center', maxWidth: 440, margin: 0 }}>
        Hasta 4 jugadores pujan por futbolistas misteriosos para armar su once. Gana quien junte más partidos de selección.
      </p>
      {errorMsg && <ErrorText text={errorMsg} />}
      <PrimaryButton label="Crear sala" onClick={() => setView('config')} />
      <SecondaryButton label="Unirse con código" onClick={() => setView('join')} />
      <SecondaryButton label="Volver" onClick={onBack} />
    </CenteredCard>
  );
}
