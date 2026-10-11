import { useEffect, useState } from 'react';
import { getLiveMatches, type LiveMatch } from '../lib/liveMatches';

const POLL_MS = 60_000;

export function useLiveMatches() {
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getLiveMatches();
        if (!cancelled) setMatches(data);
      } catch {
        // Decoration, not core gameplay — fail quietly and just show nothing.
        if (!cancelled) setMatches([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { matches, loading };
}
