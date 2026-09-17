import { supabase } from './supabaseClient';
import { TUTTI_CATEGORY_POOL, TUTTI_LETTERS, type TuttiCategory } from '../data/tuttiCategories';
import { validateTuttiAnswer } from './tuttiValidation';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

function generateJoinCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return code;
}

export type TuttiStatus = 'waiting' | 'round_active' | 'round_grace' | 'round_results' | 'finished';

export interface TuttiSessionRow {
  id: string;
  join_code: string;
  host_id: string;
  max_players: number;
  status: TuttiStatus;
  category_keys: string[];
  rounds_total: number;
  current_round: number;
  current_letter: string | null;
  basta_player_id: string | null;
  basta_at: string | null;
  created_at: string;
}

export interface TuttiPlayerRow {
  id: string;
  session_id: string;
  player_id: string;
  nickname: string;
  total_score: number;
  joined_at: string;
}

export interface TuttiAnswerRow {
  id: string;
  session_id: string;
  round: number;
  player_id: string;
  category_key: string;
  answer: string;
  is_valid: boolean | null;
  points: number | null;
  created_at: string;
}

export function categoriesForSession(session: TuttiSessionRow): TuttiCategory[] {
  return session.category_keys
    .map((key) => TUTTI_CATEGORY_POOL.find((c) => c.key === key))
    .filter((c): c is TuttiCategory => Boolean(c));
}

export function randomLetter(): string {
  return TUTTI_LETTERS[Math.floor(Math.random() * TUTTI_LETTERS.length)];
}

export interface CreateTuttiOptions {
  maxPlayers: number;
  categoryKeys: string[];
  roundsTotal: number;
}

export async function createTuttiSession(nickname: string, options: CreateTuttiOptions): Promise<TuttiSessionRow> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No hay sesión activa.');

  for (let attempt = 0; attempt < 5; attempt++) {
    const joinCode = generateJoinCode();
    const { data, error } = await supabase
      .from('tutti_sessions')
      .insert({
        join_code: joinCode,
        host_id: user.id,
        max_players: options.maxPlayers,
        category_keys: options.categoryKeys,
        rounds_total: options.roundsTotal,
        status: 'waiting',
      })
      .select()
      .single();

    if (!error) {
      const { error: playerError } = await supabase
        .from('tutti_players')
        .insert({ session_id: data.id, player_id: user.id, nickname });
      if (playerError) throw new Error(playerError.message);
      return data as TuttiSessionRow;
    }
    if (!error.message.includes('join_code')) throw new Error(error.message);
  }

  throw new Error('No se pudo crear la sala, probá de nuevo.');
}

export async function joinTuttiSession(code: string, nickname: string): Promise<TuttiSessionRow> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No hay sesión activa.');

  const { data: session, error: findError } = await supabase
    .from('tutti_sessions')
    .select('*')
    .eq('join_code', code.toUpperCase())
    .eq('status', 'waiting')
    .maybeSingle();
  if (findError) throw new Error(findError.message);
  if (!session) throw new Error('No encontramos una sala esperando con ese código.');

  const { count } = await supabase
    .from('tutti_players')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', session.id);
  if ((count ?? 0) >= session.max_players) throw new Error('La sala ya está completa.');

  const { error: insertError } = await supabase
    .from('tutti_players')
    .insert({ session_id: session.id, player_id: user.id, nickname });
  if (insertError) {
    if (insertError.message.includes('unique')) return session as TuttiSessionRow; // already joined
    throw new Error(insertError.message);
  }

  return session as TuttiSessionRow;
}

/** Host starts a round: pass a letter for manual selection, or omit it to
 * spin the roulette (random letter) — both paths the user asked for. */
export async function startTuttiRound(session: TuttiSessionRow, letter?: string): Promise<void> {
  const chosenLetter = letter ?? randomLetter();
  const { error } = await supabase
    .from('tutti_sessions')
    .update({
      status: 'round_active',
      current_round: session.current_round + 1,
      current_letter: chosenLetter,
      basta_player_id: null,
      basta_at: null,
    })
    .eq('id', session.id);
  if (error) throw new Error(error.message);
}

export async function submitTuttiAnswer(
  session: TuttiSessionRow,
  categoryKey: string,
  answer: string
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No hay sesión activa.');

  const { error } = await supabase.from('tutti_answers').upsert(
    {
      session_id: session.id,
      round: session.current_round,
      player_id: user.id,
      category_key: categoryKey,
      answer,
    },
    { onConflict: 'session_id,round,player_id,category_key' }
  );
  if (error) throw new Error(error.message);
}

/** The classic "Basta": starts the short grace period for everyone else to
 * submit what they have before the round cuts off and gets scored. */
export async function hitTuttiBasta(session: TuttiSessionRow): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No hay sesión activa.');

  const { error } = await supabase
    .from('tutti_sessions')
    .update({ status: 'round_grace', basta_player_id: user.id, basta_at: new Date().toISOString() })
    .eq('id', session.id)
    .eq('status', 'round_active');
  if (error) throw new Error(error.message);
}

/**
 * Validates every answer submitted for the round against the real data,
 * scores them (10 = valid and unique among the group, 5 = valid but shared,
 * 0 = invalid or blank), updates each player's total, and closes the round
 * — or the whole match if it was the last one. Safe to call from more than
 * one client at once: the status guard means only the first call through
 * actually does anything.
 */
export async function finalizeTuttiRound(session: TuttiSessionRow): Promise<void> {
  const { data: claimed, error: claimError } = await supabase
    .from('tutti_sessions')
    .update({ status: 'round_results' })
    .eq('id', session.id)
    .eq('status', 'round_grace')
    .select()
    .maybeSingle();
  if (claimError) throw new Error(claimError.message);
  if (!claimed) return; // another client already finalized this round

  const categories = categoriesForSession(session);
  const letter = session.current_letter ?? '';

  const { data: answers, error: answersError } = await supabase
    .from('tutti_answers')
    .select('*')
    .eq('session_id', session.id)
    .eq('round', session.current_round);
  if (answersError) throw new Error(answersError.message);

  const byCategory = new Map<string, TuttiAnswerRow[]>();
  for (const a of answers ?? []) {
    if (!byCategory.has(a.category_key)) byCategory.set(a.category_key, []);
    byCategory.get(a.category_key)!.push(a as TuttiAnswerRow);
  }

  const scoreByPlayer = new Map<string, number>();

  for (const category of categories) {
    const categoryAnswers = byCategory.get(category.key) ?? [];
    const validated: { row: TuttiAnswerRow; groupKey: string; valid: boolean }[] = await Promise.all(
      categoryAnswers.map(async (row) => {
        const result = await validateTuttiAnswer(category.rule, letter, row.answer);
        return {
          row,
          valid: result.valid,
          groupKey: (result.matchedName ?? row.answer.trim()).toLowerCase(),
        };
      })
    );

    const validCountByGroup = new Map<string, number>();
    for (const v of validated) {
      if (!v.valid) continue;
      validCountByGroup.set(v.groupKey, (validCountByGroup.get(v.groupKey) ?? 0) + 1);
    }

    for (const v of validated) {
      const points = !v.valid ? 0 : validCountByGroup.get(v.groupKey)! > 1 ? 5 : 10;
      await supabase.from('tutti_answers').update({ is_valid: v.valid, points }).eq('id', v.row.id);
      scoreByPlayer.set(v.row.player_id, (scoreByPlayer.get(v.row.player_id) ?? 0) + points);
    }
  }

  for (const [playerId, roundScore] of scoreByPlayer) {
    const { data: playerRow } = await supabase
      .from('tutti_players')
      .select('total_score')
      .eq('session_id', session.id)
      .eq('player_id', playerId)
      .single();
    await supabase
      .from('tutti_players')
      .update({ total_score: (playerRow?.total_score ?? 0) + roundScore })
      .eq('session_id', session.id)
      .eq('player_id', playerId);
  }

  const finished = session.current_round >= session.rounds_total;
  await supabase
    .from('tutti_sessions')
    .update({ status: finished ? 'finished' : 'round_results' })
    .eq('id', session.id);
}
