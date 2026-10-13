import { useEffect, useRef, useState } from 'react';
import { fetchFormationLots } from '../../lib/auctionData';
import { cpuNextBid, highestBid, makeCpuBrain, settleLot, type AuctionBid, type AuctionLot, type CpuBrain } from '../../lib/auctionEngine';
import {
  DEFAULT_FORMATION_ID,
  assignToXi,
  getFormation,
  hasFreeSlot,
  lotsPerGroup,
  type Xi,
} from '../../lib/auctionFormations';
import { AuctionBoard, type BoardBid, type BoardReveal } from './AuctionBoard';
import { AuctionResult } from './AuctionResult';
import { AuctionSettings } from './AuctionSettings';
import { CenteredCard, CenteredMessage, ErrorText, PrimaryButton, SecondaryButton, Title } from './auctionUi';
import { AUCTION } from '../../config/gameConfig';

const ME = 'me';
const CPU = 'cpu';
const TICK_MS = 200;

interface AuctionOfflineScreenProps {
  onBack: () => void;
}

interface Game {
  lots: AuctionLot[];
  avgCaps: number;
  roundIdx: number;
  phase: 'bidding' | 'reveal';
  roundStart: number;
  revealStart: number;
  bids: AuctionBid[];
  budgets: Record<string, number>;
  scores: Record<string, number>;
  xis: Record<string, Xi>;
  reveal: BoardReveal | null;
}

type Stage = 'setup' | 'loading' | 'playing' | 'finished' | 'error';

export function AuctionOfflineScreen({ onBack }: AuctionOfflineScreenProps) {
  const [stage, setStage] = useState<Stage>('setup');
  const [budget, setBudget] = useState(AUCTION.defaultBudget);
  const [formationId, setFormationId] = useState(DEFAULT_FORMATION_ID);
  const [lotsMode, setLotsMode] = useState<'full' | 'short'>('full');
  const [game, setGame] = useState<Game | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [bidError, setBidError] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const formation = getFormation(formationId);
  const gameRef = useRef<Game | null>(null);
  gameRef.current = game;
  const brainRef = useRef<CpuBrain>({ maxBid: 0, step: 1 });
  const settingsRef = useRef({ budget, formation });
  settingsRef.current = { budget, formation };

  function newBrain(lot: AuctionLot, g: Pick<Game, 'avgCaps' | 'budgets' | 'xis'>) {
    const { budget: total, formation: f } = settingsRef.current;
    if (!hasFreeSlot(f, g.xis[CPU], lot)) {
      brainRef.current = { maxBid: 0, step: 1 };
      return;
    }
    const emptySlots = f.slots.length - Object.keys(g.xis[CPU]).length;
    brainRef.current = makeCpuBrain(lot, total, f.slots.length, g.avgCaps, g.budgets[CPU], emptySlots);
  }

  async function startMatch() {
    setStage('loading');
    setErrorMsg(null);
    setBidError(null);
    try {
      const lots = await fetchFormationLots(lotsPerGroup(formation, 2, lotsMode));
      const avgCaps = lots.reduce((sum, l) => sum + l.caps, 0) / lots.length;
      const fresh: Game = {
        lots,
        avgCaps,
        roundIdx: 0,
        phase: 'bidding',
        roundStart: Date.now(),
        revealStart: 0,
        bids: [],
        budgets: { [ME]: budget, [CPU]: budget },
        scores: { [ME]: 0, [CPU]: 0 },
        xis: { [ME]: {}, [CPU]: {} },
        reveal: null,
      };
      newBrain(lots[0], fresh);
      setGame(fresh);
      setStage('playing');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo armar la subasta.');
      setStage('error');
    }
  }

  function settleRound() {
    const g = gameRef.current;
    if (!g || g.phase !== 'bidding') return;
    const lot = g.lots[g.roundIdx];
    const { winnerKey, price } = settleLot(g.bids);

    const budgets = { ...g.budgets };
    const scores = { ...g.scores };
    const xis = { ...g.xis };
    if (winnerKey) {
      budgets[winnerKey] -= price;
      scores[winnerKey] += lot.caps;
      xis[winnerKey] = assignToXi(settingsRef.current.formation, g.xis[winnerKey], lot);
    }

    setGame({
      ...g,
      phase: 'reveal',
      revealStart: Date.now(),
      budgets,
      scores,
      xis,
      reveal: {
        winnerLabel: winnerKey ? (winnerKey === ME ? 'Vos' : 'CPU') : null,
        winnerMine: winnerKey === ME,
        price,
        caps: lot.caps,
      },
    });
  }

  function advance() {
    const g = gameRef.current;
    if (!g || g.phase !== 'reveal') return;
    const size = settingsRef.current.formation.slots.length;
    const bothComplete = Object.keys(g.xis[ME]).length >= size && Object.keys(g.xis[CPU]).length >= size;
    if (g.roundIdx + 1 >= g.lots.length || bothComplete) {
      setStage('finished');
      return;
    }
    const next: Game = { ...g, roundIdx: g.roundIdx + 1, phase: 'bidding', roundStart: Date.now(), bids: [], reveal: null };
    newBrain(next.lots[next.roundIdx], next);
    setBidError(null);
    setGame(next);
  }

  useEffect(() => {
    if (stage !== 'playing') return;
    const timer = setInterval(() => {
      const g = gameRef.current;
      if (!g) return;
      const t = Date.now();
      setNow(t);

      if (g.phase === 'bidding') {
        const elapsed = t - g.roundStart;
        if (elapsed >= AUCTION.bidWindowMs) {
          settleRound();
          return;
        }
        const amount = cpuNextBid(brainRef.current, g.bids, CPU, elapsed);
        if (amount !== null) {
          setGame((prev) =>
            prev && prev.phase === 'bidding' && prev.roundIdx === g.roundIdx
              ? { ...prev, bids: [...prev.bids, { playerKey: CPU, amount, at: t }] }
              : prev
          );
        }
      } else if (t - g.revealStart >= AUCTION.revealMs) {
        advance();
      }
    }, TICK_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  function handleBid(amount: number) {
    const g = gameRef.current;
    if (!g || g.phase !== 'bidding') return;
    if (!hasFreeSlot(settingsRef.current.formation, g.xis[ME], g.lots[g.roundIdx])) {
      setBidError('Ya cubriste esa posición.');
      return;
    }
    if (amount > g.budgets[ME]) {
      setBidError('No te alcanza el presupuesto.');
      return;
    }
    const top = highestBid(g.bids);
    if (top && amount <= top.amount) {
      setBidError('Te ganaron de mano, mirá la puja actual.');
      return;
    }
    setBidError(null);
    setGame({ ...g, bids: [...g.bids, { playerKey: ME, amount, at: Date.now() }] });
  }

  function labelFor(key: string) {
    return key === ME ? 'Vos' : 'CPU';
  }

  if (stage === 'loading') return <CenteredMessage text="Buscando a los mejores jugadores…" />;

  if (stage === 'error') {
    return (
      <CenteredCard>
        <ErrorText text={errorMsg ?? 'Algo salió mal.'} />
        <PrimaryButton label="Reintentar" onClick={() => setStage('setup')} />
        <SecondaryButton label="Volver" onClick={onBack} />
      </CenteredCard>
    );
  }

  if (stage === 'setup' || !game) {
    return (
      <CenteredCard wide>
        <Title>Subasta vs CPU</Title>
        <AuctionSettings
          budget={budget}
          formationId={formationId}
          lotsMode={lotsMode}
          participants={2}
          onBudgetChange={setBudget}
          onFormationChange={setFormationId}
          onLotsModeChange={setLotsMode}
        />
        <PrimaryButton label="Empezar subasta" onClick={startMatch} />
        <SecondaryButton label="Volver" onClick={onBack} />
      </CenteredCard>
    );
  }

  if (stage === 'finished') {
    return (
      <CenteredCard wide>
        <Title>Tu once final</Title>
        <AuctionResult
          formation={formation}
          standings={[ME, CPU].map((key) => ({
            key,
            label: labelFor(key),
            mine: key === ME,
            score: game.scores[key],
            budgetLeft: game.budgets[key],
            xi: game.xis[key],
          }))}
        />
        <div style={{ display: 'flex', gap: 12 }}>
          <PrimaryButton label="Jugar de nuevo" onClick={() => setStage('setup')} />
          <SecondaryButton label="Volver al menú" onClick={onBack} />
        </div>
      </CenteredCard>
    );
  }

  const bidding = game.phase === 'bidding';
  const lot = game.lots[game.roundIdx];
  const top = highestBid(game.bids);
  const toBoardBid = (b: AuctionBid): BoardBid => ({ label: labelFor(b.playerKey), amount: b.amount, mine: b.playerKey === ME });

  return (
    <div style={{ position: 'relative', zIndex: 2, width: '100%', height: '100%', display: 'flex', alignItems: 'safe center', justifyContent: 'center', overflowY: 'auto' }}>
      <AuctionBoard
        phase={game.phase}
        round={game.roundIdx + 1}
        roundsTotal={game.lots.length}
        lot={lot}
        formation={formation}
        elapsedMs={bidding ? now - game.roundStart : AUCTION.bidWindowMs}
        topBid={top ? toBoardBid(top) : null}
        recentBids={game.bids.slice(-4).reverse().map(toBoardBid)}
        myBudget={game.budgets[ME]}
        budgetTotal={budget}
        hasSlot={hasFreeSlot(formation, game.xis[ME], lot)}
        standings={[ME, CPU].map((key) => ({
          key,
          label: labelFor(key),
          mine: key === ME,
          budgetLeft: game.budgets[key],
          score: game.scores[key],
          xi: game.xis[key],
        }))}
        onBid={handleBid}
        bidError={bidError}
        reveal={game.reveal}
        revealCountdown={Math.max(0, Math.ceil((AUCTION.revealMs - (now - game.revealStart)) / 1000))}
        onNext={advance}
        onExit={onBack}
      />
    </div>
  );
}
