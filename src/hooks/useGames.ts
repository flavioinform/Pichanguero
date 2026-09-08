import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Game, IconKey } from '../types';

interface GameRow {
  id: string;
  name: string;
  short_desc: string;
  how_to_play: string;
  icon_key: IconKey;
  bg_image_url: string;
  is_flagship: boolean;
  sort_order: number;
}

function mapRow(row: GameRow): Game {
  return {
    id: row.id,
    name: row.name,
    shortDesc: row.short_desc,
    howToPlay: row.how_to_play,
    iconKey: row.icon_key,
    bgImageUrl: row.bg_image_url,
    isFlagship: row.is_flagship,
    sortOrder: row.sort_order,
  };
}

interface UseGamesResult {
  games: Game[];
  loading: boolean;
  error: string | null;
}

export function useGames(): UseGamesResult {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('games')
        .select('id, name, short_desc, how_to_play, icon_key, bg_image_url, is_flagship, sort_order')
        .order('sort_order', { ascending: true });

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message);
        setGames([]);
      } else {
        setGames((data ?? []).map(mapRow));
      }
      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return { games, loading, error };
}
