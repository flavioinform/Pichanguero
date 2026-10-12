import { supabase } from './supabaseClient';
import { generateJoinCode } from './joinCode';
import { pickRosco, encodeStatuses, type LetterStatus, type RoscoEntry } from './pasapalabra';

const MAX_PLAYERS = 4;

export type PasapalabraStatus = 'waiting' | 'playing' | 'finished';

export interface PasapalabraSessionRow {
  id: string;
  join_code: string;
  host_id: string;
  status: PasapalabraStatus;
  question_ids: string[];
  duration_seconds: number;
  started_at: string | null;
  created_at: string;
}

export interface PasapalabraPlayerRow {
  id: string;
  session_id: string;
  player_id: string;
  nickname: string;
  statuses: string;
  score: number;
  finished_at: string | null;
  joined_at: string;
}

async function currentUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No hay sesión activa.');
  return user.id;
}

export async function getUsedQuestionIds(): Promise<Set<string>> {
  const { data, error } = await supabase.from('pasapalabra_used').select('question_id');
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((r) => r.question_id as string));
}

/** Records the clues a player just played so the next game gives them new ones. */
export async function markQuestionsUsed(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const playerId = await currentUserId();
  const { error } = await supabase
    .from('pasapalabra_used')
    .upsert(ids.map((question_id) => ({ player_id: playerId, question_id })), { onConflict: 'player_id,question_id' });
  if (error) throw new Error(error.message);
}

export async function createPasapalabraSession(
  nickname: string,
  options: { durationSeconds: number }
): Promise<PasapalabraSessionRow> {
  const userId = await currentUserId();

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from('pasapalabra_sessions')
      .insert({
        join_code: generateJoinCode(),
        host_id: userId,
        status: 'waiting',
        duration_seconds: options.durationSeconds,
        question_ids: [],
      })
      .select()
      .single();

    if (!error) {
      const { error: playerError } = await supabase
        .from('pasapalabra_players')
        .insert({ session_id: data.id, player_id: userId, nickname });
      if (playerError) throw new Error(playerError.message);
      return data as PasapalabraSessionRow;
    }
    if (!error.message.includes('join_code')) throw new Error(error.message);
  }

  throw new Error('No se pudo crear la sala, probá de nuevo.');
}

export async function joinPasapalabraSession(code: string, nickname: string): Promise<PasapalabraSessionRow> {
  const userId = await currentUserId();

  const { data: session, error: findError } = await supabase
    .from('pasapalabra_sessions')
    .select('*')
    .eq('join_code', code.toUpperCase())
    .eq('status', 'waiting')
    .maybeSingle();
  if (findError) throw new Error(findError.message);
  if (!session) throw new Error('No encontramos una sala esperando con ese código.');

  const { count } = await supabase
    .from('pasapalabra_players')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', session.id);
  if ((count ?? 0) >= MAX_PLAYERS) throw new Error('La sala ya está completa.');

  const { error: insertError } = await supabase
    .from('pasapalabra_players')
    .insert({ session_id: session.id, player_id: userId, nickname });
  if (insertError && !insertError.message.includes('unique')) throw new Error(insertError.message);

  return session as PasapalabraSessionRow;
}

/** The host draws the rosco from their own unused clues and everyone in the
 * room plays that same set. */
export async function startPasapalabra(session: PasapalabraSessionRow, usedIds: Set<string>): Promise<RoscoEntry[]> {
  const userId = await currentUserId();
  if (userId !== session.host_id) throw new Error('Solo el anfitrión puede empezar.');

  const ring = pickRosco(usedIds);
  const { data, error } = await supabase
    .from('pasapalabra_sessions')
    .update({
      status: 'playing',
      question_ids: ring.map((e) => e.id),
      started_at: new Date().toISOString(),
    })
    .eq('id', session.id)
    .eq('status', 'waiting')
    .select()
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('La sala ya no está esperando.');
  return ring;
}

export async function saveProgress(sessionId: string, statuses: LetterStatus[], score: number) {
  const playerId = await currentUserId();
  const { error } = await supabase
    .from('pasapalabra_players')
    .update({ statuses: encodeStatuses(statuses), score })
    .eq('session_id', sessionId)
    .eq('player_id', playerId);
  if (error) throw new Error(error.message);
}

export async function finishPlayer(sessionId: string, statuses: LetterStatus[], score: number) {
  const playerId = await currentUserId();
  const { error } = await supabase
    .from('pasapalabra_players')
    .update({ statuses: encodeStatuses(statuses), score, finished_at: new Date().toISOString() })
    .eq('session_id', sessionId)
    .eq('player_id', playerId);
  if (error) throw new Error(error.message);
}
