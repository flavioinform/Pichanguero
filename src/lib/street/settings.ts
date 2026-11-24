/** Los ajustes de POTRERO que se guardan en el navegador. */
export interface StreetSettings {
  /** efectos de sonido y público */
  sound: boolean;
  /** cambiar de jugador solo con la tecla (Q / Espacio), nunca automáticamente */
  manualSwitch: boolean;
  /** mostrar la línea de ayuda con los controles debajo de la cancha */
  controlsHelp: boolean;
}

const KEY = 'pichanguero.street.settings.v1';
/** donde se guardaba el cambio manual antes de que existieran los ajustes */
const LEGACY_MANUAL_KEY = 'pichanguero.street.manualSwitch';

const DEFAULTS: StreetSettings = { sound: true, manualSwitch: false, controlsHelp: true };

export function loadSettings(): StreetSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<StreetSettings>) };
    return { ...DEFAULTS, manualSwitch: localStorage.getItem(LEGACY_MANUAL_KEY) === '1' };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings: StreetSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // sin almacenamiento: los ajustes valen solo para esta sesión
  }
}

/** Cambia una sola opción y la guarda. */
export function updateSetting<K extends keyof StreetSettings>(key: K, value: StreetSettings[K]): StreetSettings {
  const next = { ...loadSettings(), [key]: value };
  saveSettings(next);
  return next;
}
