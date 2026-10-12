import { supabase } from './supabaseClient';
import { generateJoinCode } from './joinCode';

export type HeadSoccerSessionStatus = 'waiting' | 'ready' | 'playing' | 'finished';

export interface HeadSoccerSessionRow {
  id: string;
  join_code: string;
  host_id: string;
  guest_id: string | null;
  host_country: string;
  guest_country: string | null;
  status: HeadSoccerSessionStatus;
  created_at: string;
}

export async function createHeadSoccerSession(countryName: string): Promise<HeadSoccerSessionRow> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No hay sesión activa.');

  for (let attempt = 0; attempt < 5; attempt++) {
    const joinCode = generateJoinCode();
    const { data, error } = await supabase
      .from('headsoccer_sessions')
      .insert({ join_code: joinCode, host_id: user.id, host_country: countryName, status: 'waiting' })
      .select()
      .single();

    if (!error) return data as HeadSoccerSessionRow;
    if (!error.message.includes('join_code')) throw new Error(error.message);
  }

  throw new Error('No se pudo crear la sala, probá de nuevo.');
}

export async function joinHeadSoccerSession(code: string, countryName: string): Promise<HeadSoccerSessionRow> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No hay sesión activa.');

  const { data: session, error: findError } = await supabase
    .from('headsoccer_sessions')
    .select('*')
    .eq('join_code', code.toUpperCase())
    .eq('status', 'waiting')
    .maybeSingle();
  if (findError) throw new Error(findError.message);
  if (!session) throw new Error('No encontramos una sala esperando con ese código.');

  const { data, error } = await supabase
    .from('headsoccer_sessions')
    .update({ guest_id: user.id, guest_country: countryName, status: 'ready' })
    .eq('id', session.id)
    .eq('status', 'waiting')
    .select()
    .single();
  if (error) throw new Error('La sala ya no está disponible, probá con otro código.');

  return data as HeadSoccerSessionRow;
}

export async function startHeadSoccerMatch(session: HeadSoccerSessionRow): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No hay sesión activa.');
  if (user.id !== session.host_id) throw new Error('Solo el anfitrión puede iniciar.');

  const { error } = await supabase
    .from('headsoccer_sessions')
    .update({ status: 'playing' })
    .eq('id', session.id)
    .eq('status', 'ready');
  if (error) throw new Error(error.message);
}

export async function finishHeadSoccerMatch(session: HeadSoccerSessionRow): Promise<void> {
  const { error } = await supabase.from('headsoccer_sessions').update({ status: 'finished' }).eq('id', session.id);
  if (error) throw new Error(error.message);
}
