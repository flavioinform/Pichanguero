import { supabase } from './supabaseClient';

export async function ensureAnonymousSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) return session;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data.session;
}

export async function setNickname(nickname: string) {
  const { error } = await supabase.auth.updateUser({ data: { nickname } });
  if (error) throw error;
}
