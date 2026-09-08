import { supabase } from './supabaseClient';

export const ASSETS_BUCKET = 'game-assets';

export function getPublicAssetUrl(path: string): string {
  return supabase.storage.from(ASSETS_BUCKET).getPublicUrl(path).data.publicUrl;
}

export const LOGO_PATH = 'pichanguero-logo.png';
