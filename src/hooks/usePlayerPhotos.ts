import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

let pool: Promise<string[]> | null = null;

async function fetchPool(): Promise<string[]> {
  const { data, error } = await supabase
    .from('players')
    .select('image_url')
    .not('image_url', 'is', null)
    .limit(60);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.image_url as string);
}

function loadPool(): Promise<string[]> {
  if (!pool) {
    pool = fetchPool().catch((err) => {
      pool = null;
      throw err;
    });
  }
  return pool;
}

function pickRandom(urls: string[], count: number): string[] {
  const copy = [...urls];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

/** Random real player photos for a menu card. The pool is fetched once per
 * session and shared across cards; each enabled card picks its own subset. */
export function usePlayerPhotos(enabled: boolean, count: number): string[] {
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    loadPool()
      .then((urls) => {
        if (!cancelled) setPhotos(pickRandom(urls, count));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [enabled, count]);

  return photos;
}
