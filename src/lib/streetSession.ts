import { supabase } from './supabaseClient';
import { generateJoinCode } from './joinCode';

export type StreetSessionStatus = 'waiting' | 'ready' | 'playing' | 'finished';

export interface StreetSessionRow {
  id: string;
  join_code: string;
  host_id: string;
  guest_id: string | null;
  host_country: string;
  guest_country: string | null;
  status: StreetSessionStatus;
  created_at: string;
}

async function requireUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No hay sesión activa.');
  return user;
}

export async function createStreetSession(countryName: string): Promise<StreetSessionRow> {
  const user = await requireUser();

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from('street_sessions')
      .insert({ join_code: generateJoinCode(), host_id: user.id, host_country: countryName, status: 'waiting' })
      .select()
      .single();

    if (!error) return data as StreetSessionRow;
    if (!error.message.includes('join_code')) throw new Error(error.message);
  }

  throw new Error('No se pudo crear la sala, probá de nuevo.');
}

export async function joinStreetSession(code: string, countryName: string): Promise<StreetSessionRow> {
  const user = await requireUser();

  const { data: session, error: findError } = await supabase
    .from('street_sessions')
    .select('*')
    .eq('join_code', code.toUpperCase())
    .eq('status', 'waiting')
    .maybeSingle();
  if (findError) throw new Error(findError.message);
  if (!session) throw new Error('No encontramos una sala esperando con ese código.');

  const { data, error } = await supabase
    .from('street_sessions')
    .update({ guest_id: user.id, guest_country: countryName, status: 'ready' })
    .eq('id', session.id)
    .eq('status', 'waiting')
    .select()
    .single();
  if (error) throw new Error('La sala ya no está disponible, probá con otro código.');

  return data as StreetSessionRow;
}

export async function startStreetMatch(session: StreetSessionRow): Promise<void> {
  const user = await requireUser();
  if (user.id !== session.host_id) throw new Error('Solo el anfitrión puede iniciar.');

  const { error } = await supabase.from('street_sessions').update({ status: 'playing' }).eq('id', session.id).eq('status', 'ready');
  if (error) throw new Error(error.message);
}
