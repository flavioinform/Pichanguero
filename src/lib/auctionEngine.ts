import { AUCTION } from '../config/gameConfig';
export interface AuctionLot {
  id: number;
  name: string;
  imageUrl: string | null;
  country: string | null;
  position: string | null;
  subPosition: string | null;
  foot: string | null;
  heightCm: number | null;
  birthYear: number | null;
  clubName: string | null;
  /** legends and retired stars: where and when they were at their best */
  prime: string | null;
  caps: number;
}

export interface AuctionBid {
  playerKey: string;
  amount: number;
  /** epoch ms; ties on amount go to whoever bid first */
  at: number;
}

const SUB_POSITION_ES: Record<string, string> = {
  Goalkeeper: 'Arquero',
  'Centre-Back': 'Defensor central',
  'Left-Back': 'Lateral izquierdo',
  'Right-Back': 'Lateral derecho',
  'Defensive Midfield': 'Mediocampista defensivo',
  'Central Midfield': 'Mediocampista central',
  'Left Midfield': 'Mediocampista izquierdo',
  'Right Midfield': 'Mediocampista derecho',
  'Attacking Midfield': 'Mediocampista ofensivo',
  'Left Winger': 'Extremo izquierdo',
  'Right Winger': 'Extremo derecho',
  'Second Striker': 'Segundo delantero',
  'Centre-Forward': 'Delantero centro',
};

const POSITION_ES: Record<string, string> = {
  Goalkeeper: 'Arquero',
  Defender: 'Defensor',
  Midfield: 'Mediocampista',
  Attack: 'Delantero',
};

const FOOT_ES: Record<string, string> = { right: 'derecho', left: 'izquierdo', both: 'ambidiestro' };

export function capsBucket(caps: number): string {
  if (caps < 50) return 'menos de 50';
  if (caps < 80) return '50 a 80';
  if (caps < 110) return '80 a 110';
  if (caps < 140) return '110 a 140';
  return 'más de 140';
}

export interface AuctionClue {
  label: string;
  text: string;
}

/** Four clues that get more telling over time — position first, then who
 * they play for, then their club, then how big a name they are. */
export function buildClues(lot: AuctionLot, nowYear = new Date().getFullYear()): AuctionClue[] {
  const position =
    (lot.subPosition && SUB_POSITION_ES[lot.subPosition]) || (lot.position && POSITION_ES[lot.position]) || 'Sin dato';
  const foot = lot.foot ? FOOT_ES[lot.foot.toLowerCase()] : null;
  const age = lot.birthYear ? nowYear - lot.birthYear : null;

  const clue1 = foot ? `${position} · pie ${foot}` : position;
  const clue2 = [lot.country ?? 'Nacionalidad desconocida', age ? `${age} años` : null].filter(Boolean).join(' · ');
  const clue4 = `${capsBucket(lot.caps)} partidos con su selección`;

  // Legends and retired stars have no "current club": show where they were
  // at their peak instead.
  const third = lot.prime
    ? { label: 'Prime', text: lot.prime }
    : lot.clubName
      ? { label: 'Club', text: lot.clubName }
      : { label: 'Físico', text: lot.heightCm ? `Mide ${(lot.heightCm / 100).toFixed(2)} m` : 'Sin club actual' };

  return [
    { label: 'Posición', text: clue1 },
    { label: 'Origen', text: clue2 },
    third,
    { label: 'Trayectoria', text: clue4 },
  ];
}

export function cluesRevealed(elapsedMs: number): number {
  return AUCTION.clueAtMs.filter((t) => elapsedMs >= t).length;
}

export function highestBid(bids: AuctionBid[]): AuctionBid | null {
  let best: AuctionBid | null = null;
  for (const b of bids) {
    if (!best || b.amount > best.amount || (b.amount === best.amount && b.at < best.at)) best = b;
  }
  return best;
}

export function minNextBid(bids: AuctionBid[]): number {
  return (highestBid(bids)?.amount ?? 0) + 1;
}

/** Raise buttons scale with the budget so a 500M game isn't all +1 clicks. */
export function bidSteps(budget: number): [number, number, number] {
  const small = Math.max(1, Math.round(budget / 100));
  return [small, small * 5, small * 10];
}

export function settleLot(bids: AuctionBid[]): { winnerKey: string | null; price: number } {
  const top = highestBid(bids);
  return top ? { winnerKey: top.playerKey, price: top.amount } : { winnerKey: null, price: 0 };
}

export interface AuctionStanding {
  key: string;
  label: string;
  score: number;
  budgetLeft: number;
}

export function rankStandings<T extends AuctionStanding>(standings: T[]): T[] {
  return [...standings].sort((a, b) => b.score - a.score || b.budgetLeft - a.budgetLeft);
}

export interface CpuBrain {
  maxBid: number;
  step: number;
}

/** The CPU only "sees" a noisy estimate of the lot's caps, and sizes what it
 * is willing to pay against its share of the budget — so it overpays for
 * some lots and steals others, like a human reading the clues would. */
export function makeCpuBrain(
  lot: AuctionLot,
  budgetTotal: number,
  squadSize: number,
  avgCaps: number,
  budgetLeft: number,
  emptySlots: number
): CpuBrain {
  const estimate = lot.caps * (0.65 + Math.random() * 0.7);
  const fairPrice = (budgetTotal / squadSize) * (estimate / Math.max(1, avgCaps));
  const aggression = 0.75 + Math.random() * 0.45;
  // Keep at least 1M back for every other slot still to fill.
  const spendable = Math.max(0, budgetLeft - Math.max(0, emptySlots - 1));
  const maxBid = Math.max(0, Math.min(spendable, Math.round(fairPrice * aggression)));
  const step = Math.max(1, Math.round(budgetTotal * 0.02 * (0.5 + Math.random())));
  return { maxBid, step };
}

export function cpuNextBid(brain: CpuBrain, bids: AuctionBid[], cpuKey: string, elapsedMs: number): number | null {
  if (elapsedMs < 1500) return null;
  const top = highestBid(bids);
  if (top?.playerKey === cpuKey) return null;
  const floor = (top?.amount ?? 0) + 1;
  if (floor > brain.maxBid) return null;
  const lateWindow = elapsedMs > AUCTION.bidWindowMs - 4000;
  if (Math.random() > (lateWindow ? 0.35 : 0.1)) return null;
  return Math.min(brain.maxBid, Math.max(floor, (top?.amount ?? 0) + brain.step));
}
