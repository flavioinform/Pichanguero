import { LETTERS, PASAPALABRA_BANK, type BankEntry } from '../data/pasapalabraBank';

export type RoscoEntry = BankEntry;

export const BEST_KEY = 'pasapalabra:best';

export function entryById(id: string): RoscoEntry | undefined {
  return PASAPALABRA_BANK.find((e) => e.id === id);
}

/** Picks one clue per letter, in ring order, skipping clues this player has
 * already had. Only when every clue for a letter has been used does it fall
 * back to the full set, so a player keeps getting fresh questions until the
 * bank runs out. */
export function pickRosco(usedIds: Set<string>): RoscoEntry[] {
  return LETTERS.map((letter) => {
    const variants = PASAPALABRA_BANK.filter((e) => e.letter === letter);
    const fresh = variants.filter((e) => !usedIds.has(e.id));
    const pool = fresh.length > 0 ? fresh : variants;
    return pool[Math.floor(Math.random() * pool.length)];
  });
}

/** Fragment revealed by the 'starts' and 'contains' clue kinds. It's always
 * a piece of the answer, never the whole word, so the clue narrows things
 * down without giving the answer away. */
export function fragmentFor(entry: RoscoEntry): string {
  const answer = entry.answer.toUpperCase();
  if (entry.kind === 'starts') return answer.slice(0, 2);
  const longest = answer.split(' ').reduce((a, b) => (b.length > a.length ? b : a), '');
  return longest.length >= 5 ? longest.slice(1, 4) : longest.slice(0, 2);
}

export function presentClue(entry: RoscoEntry): string {
  if (entry.kind === 'starts') return `Empieza por «${fragmentFor(entry)}»: ${entry.clue}`;
  if (entry.kind === 'contains') return `Contiene «${fragmentFor(entry)}»: ${entry.clue}`;
  return entry.clue;
}

export function normalizeAnswer(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isCorrectAnswer(entry: RoscoEntry, input: string): boolean {
  const normalized = normalizeAnswer(input);
  if (!normalized) return false;
  if (normalized === normalizeAnswer(entry.answer)) return true;
  return entry.aliases.some((alias) => normalized === normalizeAnswer(alias));
}

export type LetterStatus = 'pending' | 'correct' | 'wrong';

const STATUS_CODE: Record<LetterStatus, string> = { pending: 'p', correct: 'c', wrong: 'w' };
const CODE_STATUS: Record<string, LetterStatus> = { p: 'pending', c: 'correct', w: 'wrong' };

export function encodeStatuses(statuses: LetterStatus[]): string {
  return statuses.map((s) => STATUS_CODE[s]).join('');
}

export function decodeStatuses(code: string, length: number): LetterStatus[] {
  return Array.from({ length }, (_, i) => CODE_STATUS[code[i]] ?? 'pending');
}

/** Next letter still to play, going around the ring from `from`. Returns
 * `from` itself when it's the only one left, and null when none remain. */
export function nextPendingIndex(statuses: LetterStatus[], from: number): number | null {
  const count = statuses.length;
  for (let step = 1; step <= count; step++) {
    const index = (from + step) % count;
    if (statuses[index] === 'pending') return index;
  }
  return null;
}

export function loadBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function saveBest(score: number) {
  try {
    localStorage.setItem(BEST_KEY, String(score));
  } catch {
    // storage blocked — the score just won't persist
  }
}
