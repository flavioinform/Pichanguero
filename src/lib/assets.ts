import { supabase } from './supabaseClient';

export const ASSETS_BUCKET = 'game-assets';

export function getPublicAssetUrl(path: string): string {
  return supabase.storage.from(ASSETS_BUCKET).getPublicUrl(path).data.publicUrl;
}

export const LOGO_PATH = 'pichanguero-logo.png';

/** Neutral white jersey product photo (no text/number/color baked in) used
 * as the base for the career-mode jersey preview — recolored per nationality
 * and overlaid with name/number in code instead of generating a new image
 * per player. Uploaded once via `npm run upload:jersey-template`. */
export const JERSEY_TEMPLATE_PATH = 'jersey-template.jpg';