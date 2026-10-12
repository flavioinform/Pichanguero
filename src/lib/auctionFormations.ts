import type { AuctionLot } from './auctionEngine';
import { AUCTION } from '../config/gameConfig';

export type PositionGroup = 'GK' | 'DEF' | 'MID' | 'ATT';

export const GROUP_LABEL: Record<PositionGroup, string> = {
  GK: 'Arquero',
  DEF: 'Defensor',
  MID: 'Mediocampista',
  ATT: 'Delantero',
};

const GROUP_BY_POSITION: Record<string, PositionGroup> = {
  Goalkeeper: 'GK',
  Defender: 'DEF',
  Midfield: 'MID',
  Attack: 'ATT',
};

export function groupOf(position: string | null): PositionGroup | null {
  return position ? (GROUP_BY_POSITION[position] ?? null) : null;
}

export const POSITION_BY_GROUP: Record<PositionGroup, string> = {
  GK: 'Goalkeeper',
  DEF: 'Defender',
  MID: 'Midfield',
  ATT: 'Attack',
};

export interface FormationSlot {
  id: string;
  group: PositionGroup;
  /** short role shown on an empty slot */
  label: string;
  /** DB sub_position values that fit this slot best */
  prefer: string[];
  /** pitch coordinates in percent: x left→right, y top (attack) → bottom (own goal) */
  x: number;
  y: number;
}

export interface Formation {
  id: string;
  slots: FormationSlot[];
}

function slot(id: string, group: PositionGroup, label: string, prefer: string[], x: number, y: number): FormationSlot {
  return { id, group, label, prefer, x, y };
}

const GK = slot('gk', 'GK', 'POR', ['Goalkeeper'], 50, 89);
const BACK_FOUR = [
  slot('lb', 'DEF', 'LI', ['Left-Back'], 13, 71),
  slot('cb1', 'DEF', 'DFC', ['Centre-Back'], 37, 74),
  slot('cb2', 'DEF', 'DFC', ['Centre-Back'], 63, 74),
  slot('rb', 'DEF', 'LD', ['Right-Back'], 87, 71),
];

export const FORMATIONS: Formation[] = [
  {
    id: '4-3-3',
    slots: [
      GK,
      ...BACK_FOUR,
      slot('cm1', 'MID', 'MC', ['Central Midfield', 'Defensive Midfield'], 27, 50),
      slot('cm2', 'MID', 'MC', ['Central Midfield', 'Defensive Midfield'], 50, 55),
      slot('cm3', 'MID', 'MC', ['Attacking Midfield', 'Central Midfield'], 73, 50),
      slot('lw', 'ATT', 'EI', ['Left Winger'], 17, 25),
      slot('st', 'ATT', 'DC', ['Centre-Forward', 'Second Striker'], 50, 17),
      slot('rw', 'ATT', 'ED', ['Right Winger'], 83, 25),
    ],
  },
  {
    id: '4-4-2',
    slots: [
      GK,
      ...BACK_FOUR,
      slot('lm', 'MID', 'MI', ['Left Midfield'], 13, 50),
      slot('cm1', 'MID', 'MC', ['Central Midfield', 'Defensive Midfield'], 38, 53),
      slot('cm2', 'MID', 'MC', ['Central Midfield', 'Attacking Midfield'], 62, 53),
      slot('rm', 'MID', 'MD', ['Right Midfield'], 87, 50),
      slot('st1', 'ATT', 'DC', ['Centre-Forward', 'Second Striker'], 36, 20),
      slot('st2', 'ATT', 'DC', ['Centre-Forward', 'Second Striker'], 64, 20),
    ],
  },
  {
    id: '3-5-2',
    slots: [
      GK,
      slot('cb1', 'DEF', 'DFC', ['Centre-Back'], 24, 73),
      slot('cb2', 'DEF', 'DFC', ['Centre-Back', 'Sweeper'], 50, 76),
      slot('cb3', 'DEF', 'DFC', ['Centre-Back'], 76, 73),
      slot('lm', 'MID', 'MI', ['Left Midfield'], 9, 50),
      slot('cm1', 'MID', 'MC', ['Central Midfield'], 30, 50),
      slot('dm', 'MID', 'MCD', ['Defensive Midfield'], 50, 58),
      slot('cm2', 'MID', 'MC', ['Central Midfield', 'Attacking Midfield'], 70, 50),
      slot('rm', 'MID', 'MD', ['Right Midfield'], 91, 50),
      slot('st1', 'ATT', 'DC', ['Centre-Forward', 'Second Striker'], 36, 20),
      slot('st2', 'ATT', 'DC', ['Centre-Forward', 'Second Striker'], 64, 20),
    ],
  },
  {
    id: '4-2-3-1',
    slots: [
      GK,
      ...BACK_FOUR,
      slot('dm1', 'MID', 'MCD', ['Defensive Midfield', 'Central Midfield'], 36, 58),
      slot('dm2', 'MID', 'MCD', ['Defensive Midfield', 'Central Midfield'], 64, 58),
      slot('am', 'MID', 'MCO', ['Attacking Midfield'], 50, 38),
      slot('lw', 'ATT', 'EI', ['Left Winger'], 17, 33),
      slot('rw', 'ATT', 'ED', ['Right Winger'], 83, 33),
      slot('st', 'ATT', 'DC', ['Centre-Forward', 'Second Striker'], 50, 15),
    ],
  },
];

export const DEFAULT_FORMATION_ID = '4-3-3';

export function getFormation(id: string): Formation {
  return FORMATIONS.find((f) => f.id === id) ?? FORMATIONS[0];
}

export function slotCounts(formation: Formation): Record<PositionGroup, number> {
  const counts: Record<PositionGroup, number> = { GK: 0, DEF: 0, MID: 0, ATT: 0 };
  for (const s of formation.slots) counts[s.group] += 1;
  return counts;
}

/** slot id → the lot that filled it */
export type Xi = Record<string, AuctionLot>;

export function freeSlots(formation: Formation, xi: Xi, group: PositionGroup): FormationSlot[] {
  return formation.slots.filter((s) => s.group === group && !xi[s.id]);
}

export function hasFreeSlot(formation: Formation, xi: Xi, lot: AuctionLot | null): boolean {
  const group = groupOf(lot?.position ?? null);
  return !!group && freeSlots(formation, xi, group).length > 0;
}

/** Puts a won player in the best free slot of his position group — the one
 * whose role matches his sub-position if there is one (a left-back goes to
 * the left-back slot), otherwise the first free slot of that group. */
export function assignToXi(formation: Formation, xi: Xi, lot: AuctionLot): Xi {
  const group = groupOf(lot.position);
  if (!group) return xi;
  const free = freeSlots(formation, xi, group);
  if (free.length === 0) return xi;
  const target = free.find((s) => lot.subPosition && s.prefer.includes(lot.subPosition)) ?? free[0];
  return { ...xi, [target.id]: lot };
}

/** How many lots to draw per position: a full XI for every participant, or
 * a shorter ~60% version that leaves some slots empty. */
export function lotsPerGroup(
  formation: Formation,
  participants: number,
  mode: 'full' | 'short'
): Record<PositionGroup, number> {
  const base = slotCounts(formation);
  const factor = mode === 'full' ? 1 : AUCTION.shortModeFactor;
  const result = { ...base };
  (Object.keys(base) as PositionGroup[]).forEach((g) => {
    result[g] = Math.max(1, Math.round(base[g] * participants * factor));
  });
  return result;
}
