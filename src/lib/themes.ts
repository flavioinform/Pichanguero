import { getPublicAssetUrl } from './assets';

export interface MenuTheme {
  id: string;
  label: string;
  url: string;
}

export const MENU_THEMES: MenuTheme[] = [
  { id: 'hinchada', label: 'Hinchada', url: getPublicAssetUrl('bg-gato.png') },
  { id: 'chilena', label: 'Chilena', url: getPublicAssetUrl('bg-tutti.png') },
  { id: 'estadio', label: 'Estadio nocturno', url: getPublicAssetUrl('bg-adivina.png') },
];

const STORAGE_KEY = 'pichanguero-menu-theme';
const CUSTOM_WALLPAPER_KEY = 'pichanguero-custom-wallpaper';
export const CUSTOM_THEME_ID = 'custom';
const CUSTOM_MAX_SIDE = 1920;

/** `null` means "auto": each game keeps its own background from the DB. */
export function loadThemeId(): string | null {
  try {
    const id = localStorage.getItem(STORAGE_KEY);
    if (id === CUSTOM_THEME_ID) return loadCustomWallpaper() ? id : null;
    return MENU_THEMES.some((t) => t.id === id) ? id : null;
  } catch {
    return null;
  }
}

/** Fondo que sube el usuario, guardado como data URL en su navegador. */
export function loadCustomWallpaper(): string | null {
  try {
    return localStorage.getItem(CUSTOM_WALLPAPER_KEY);
  } catch {
    return null;
  }
}

/** Devuelve false si el navegador no pudo guardarlo (por ejemplo, cuota llena). */
export function saveCustomWallpaper(dataUrl: string): boolean {
  try {
    localStorage.setItem(CUSTOM_WALLPAPER_KEY, dataUrl);
    return true;
  } catch {
    return false;
  }
}

/** Reduce la imagen a 1920 px como máximo y la pasa a JPEG para que entre en localStorage. */
export function imageFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, CUSTOM_MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext('2d');
      URL.revokeObjectURL(objectUrl);
      if (!ctx) return reject(new Error('El navegador no pudo procesar la imagen'));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('No se pudo leer la imagen'));
    };
    img.src = objectUrl;
  });
}

export function saveThemeId(id: string | null): void {
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be blocked (private mode); the choice then just isn't remembered.
  }
}
