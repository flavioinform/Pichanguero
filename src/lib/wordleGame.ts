import { supabase } from './supabaseClient';
import { WORDLE_PLAYERS } from '../data/wordlePool';

export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;
const DAY_KEY_PREFIX = 'wordle-letters:day:';
const STATS_KEY = 'wordle-letters:stats';
const DAY_MS = 86_400_000;

export type LetterStatus = 'correct' | 'present' | 'absent';

export interface Target {
  id: number;
  name: string;
  word: string;
}

function normalizeLetters(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z]/g, '')
    .toUpperCase();
}

function surnameWord(name: string): string {
  return normalizeLetters(name.split(' ').slice(-1)[0]);
}

const TARGETS: Target[] = WORDLE_PLAYERS.map((p) => ({ id: p.id, name: p.name, word: surnameWord(p.name) })).filter(
  (t) => t.word.length === WORD_LENGTH
);

/** Every word the player can guess — the surnames of the curated players,
 * so a guess is always a real player's name. */
const VALID_WORDS = new Set(TARGETS.map((t) => t.word));

export function dateKeyUtc(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function previousDateKey(dateKey: string): string {
  return new Date(Date.parse(`${dateKey}T00:00:00Z`) - DAY_MS).toISOString().slice(0, 10);
}

function dayNumber(dateKey: string): number {
  return Math.floor(Date.parse(`${dateKey}T00:00:00Z`) / DAY_MS);
}

/** Same date → same player for everyone, with no server job. The multiplier
 * scrambles consecutive days so the answers don't follow list order. */
export function getDailyTarget(dateKey: string): Target {
  const index = (dayNumber(dateKey) * 1103515245 + 12345) % TARGETS.length;
  return TARGETS[index];
}

export function isValidWord(word: string): boolean {
  return VALID_WORDS.has(word);
}

/** Standard Wordle scoring, including repeated letters: an exact match takes
 * priority, so a letter that appears twice in the guess but once in the
 * answer only lights up once. */
export function evaluateGuess(guess: string, answer: string): LetterStatus[] {
  const result: LetterStatus[] = Array(WORD_LENGTH).fill('absent');
  const remaining: Record<string, number> = {};

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guess[i] === answer[i]) result[i] = 'correct';
    else remaining[answer[i]] = (remaining[answer[i]] ?? 0) + 1;
  }
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i] === 'correct') continue;
    if (remaining[guess[i]] > 0) {
      result[i] = 'present';
      remaining[guess[i]] -= 1;
    }
  }
  return result;
}

export async function fetchPlayerImage(id: number): Promise<string | null> {
  const { data, error } = await supabase.from('players').select('image_url').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.image_url as string | null) ?? null;
}

export interface DayRecord {
  guesses: string[];
}

export interface Stats {
  played: number;
  won: number;
  streak: number;
  maxStreak: number;
  lastWonDate: string | null;
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage blocked (private mode) — the game still works, just won't persist
  }
}

/** Per-device progress only: what I already guessed today on this browser. */
export function loadDayRecord(dateKey: string): DayRecord {
  const raw = safeGet(DAY_KEY_PREFIX + dateKey);
  if (!raw) return { guesses: [] };
  try {
    const parsed = JSON.parse(raw) as DayRecord;
    return { guesses: Array.isArray(parsed.guesses) ? parsed.guesses : [] };
  } catch {
    return { guesses: [] };
  }
}

export function saveDayRecord(dateKey: string, record: DayRecord) {
  safeSet(DAY_KEY_PREFIX + dateKey, JSON.stringify(record));
}

const EMPTY_STATS: Stats = { played: 0, won: 0, streak: 0, maxStreak: 0, lastWonDate: null };

export function loadStats(): Stats {
  const raw = safeGet(STATS_KEY);
  if (!raw) return EMPTY_STATS;
  try {
    return { ...EMPTY_STATS, ...(JSON.parse(raw) as Stats) };
  } catch {
    return EMPTY_STATS;
  }
}

export function recordFinish(dateKey: string, won: boolean): Stats {
  const stats = loadStats();
  const next: Stats = { ...stats, played: stats.played + 1 };
  if (won) {
    next.won = stats.won + 1;
    next.streak = stats.lastWonDate === previousDateKey(dateKey) ? stats.streak + 1 : 1;
    next.maxStreak = Math.max(stats.maxStreak, next.streak);
    next.lastWonDate = dateKey;
  } else {
    next.streak = 0;
  }
  safeSet(STATS_KEY, JSON.stringify(next));
  return next;
}
