import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ensureAnonymousSession, setNickname } from '../lib/auth';

interface AuthState {
  userId: string | null;
  nickname: string | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ userId: null, nickname: null, loading: true });

  useEffect(() => {
    let cancelled = false;

    ensureAnonymousSession()
      .then((session) => {
        if (cancelled || !session) return;
        setState({
          userId: session.user.id,
          nickname: (session.user.user_metadata?.nickname as string | undefined) ?? null,
          loading: false,
        });
      })
      .catch((err) => {
        console.error('Failed to start anonymous session', err);
        if (!cancelled) setState((s) => ({ ...s, loading: false }));
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({
        userId: session?.user.id ?? null,
        nickname: (session?.user.user_metadata?.nickname as string | undefined) ?? null,
        loading: false,
      });
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  async function updateNickname(nickname: string) {
    await setNickname(nickname);
    setState((s) => ({ ...s, nickname }));
  }

  return { ...state, setNickname: updateNickname };
}
