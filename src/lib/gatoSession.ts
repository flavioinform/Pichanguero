import { supabase } from './supabaseClient';
import { generateGatoGrid, checkGatoAnswer, isGatoBoardFinished, type GridCriterion, type Difficulty } from './gatoGrid';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

function generateJoinCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export interface GatoSessionRow {
  id: string;
  game_id: string;
  player_a: string;
  player_b: string | null;
  player_a_nickname: string | null;
  player_b_nickname: string | null;
  status: 'waiting' | 'active' | 'finished';
  current_turn: string | null;
  join_code: string;
  row_criteria: [GridCriterion, GridCriterion, GridCriterion];
  col_criteria: [GridCriterion, GridCriterion, GridCriterion];
  scores: Record<string, number>;
  created_at: string;
}

export async function createGatoSession(nickname: string, difficulty: Difficulty): Promise<GatoSessionRow> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No hay sesión activa.');

  const grid = await generateGatoGrid(difficulty);

  // join_code has a unique constraint; retry on the rare collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const joinCode = generateJoinCode();
    const { data, error } = await supabase
      .from('game_sessions')
      .insert({
        game_id: 'gato',
        player_a: user.id,
        player_a_nickname: nickname,
        status: 'waiting',
        join_code: joinCode,
        row_criteria: grid.rowCriteria,
        col_criteria: grid.colCriteria,
        scores: {},
      })
      .select()
      .single();

    if (!error) return data as GatoSessionRow;
    if (!error.message.includes('join_code')) throw new Error(error.message);
  }

  throw new Error('No se pudo crear la partida, probá de nuevo.');
}

export async function joinGatoSession(code: string, nickname: string): Promise<GatoSessionRow> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No hay sesión activa.');

  const { data: existing, error: findError } = await supabase
    .from('game_sessions')
    .select('*')
    .eq('join_code', code.toUpperCase())
    .eq('status', 'waiting')
    .maybeSingle();

  if (findError) throw new Error(findError.message);
  if (!existing) throw new Error('No encontramos una partida esperando con ese código.');
  if (existing.player_a === user.id) throw new Error('No podés unirte a tu propia partida.');

  const { data, error } = await supabase
    .from('game_sessions')
    .update({
      player_b: user.id,
      player_b_nickname: nickname,
      status: 'active',
      current_turn: existing.player_a,
    })
    .eq('id', existing.id)
    .eq('status', 'waiting')
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as GatoSessionRow;
}

export interface SubmitTurnResult {
  correct: boolean;
  matchedPlayerName?: string;
}

export async function submitGatoTurn(
  session: GatoSessionRow,
  rowIndex: number,
  colIndex: number,
  answer: string
): Promise<SubmitTurnResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No hay sesión activa.');
  if (session.current_turn !== user.id) throw new Error('No es tu turno.');

  const rowCriterion = session.row_criteria[rowIndex];
  const colCriterion = session.col_criteria[colIndex];
  const result = await checkGatoAnswer(answer, rowCriterion, colCriterion);

  const { error: turnError } = await supabase.from('game_turns').insert({
    session_id: session.id,
    player_id: user.id,
    row_index: rowIndex,
    col_index: colIndex,
    answer,
    is_correct: result.correct,
  });
  if (turnError) throw new Error(turnError.message);

  const nextTurn = session.player_a === user.id ? session.player_b : session.player_a;
  const nextScores = result.correct
    ? { ...session.scores, [user.id]: (session.scores[user.id] ?? 0) + 1 }
    : session.scores;

  // A wrong answer doesn't close the cell — it "bounces" to the other
  // player instead, same as a timeout (see passGatoTurn). A cell only
  // counts as done once it's answered correctly, or has resisted enough
  // failed attempts to be given up on (see isGatoBoardFinished).
  const { data: allTurns, error: turnsReadError } = await supabase
    .from('game_turns')
    .select('row_index, col_index, is_correct')
    .eq('session_id', session.id);
  if (turnsReadError) throw new Error(turnsReadError.message);

  const boardFull = isGatoBoardFinished(
    (allTurns ?? []).map((t) => ({ row: t.row_index, col: t.col_index, correct: t.is_correct }))
  );

  const { error: updateError } = await supabase
    .from('game_sessions')
    .update({
      current_turn: boardFull ? null : nextTurn,
      scores: nextScores,
      status: boardFull ? 'finished' : 'active',
    })
    .eq('id', session.id);
  if (updateError) throw new Error(updateError.message);

  return { correct: result.correct, matchedPlayerName: result.matchedPlayerName };
}

/** Turn passed without an attempt — the 30s clock ran out. Same "bounce" as
 * a wrong answer: no cell closes, it's just the other player's turn now. */
export async function passGatoTurn(session: GatoSessionRow): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No hay sesión activa.');
  if (session.current_turn !== user.id) return;

  const nextTurn = session.player_a === user.id ? session.player_b : session.player_a;
  const { error } = await supabase.from('game_sessions').update({ current_turn: nextTurn }).eq('id', session.id);
  if (error) throw new Error(error.message);
}
