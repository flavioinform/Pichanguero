import type { CareerPlayerState } from './careerTypes';

const SAVE_KEY = 'pichanguero.career.v1';

export function loadCareerSave(): CareerPlayerState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CareerPlayerState;
  } catch {
    return null;
  }
}

export function saveCareer(state: CareerPlayerState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable (private mode, quota) — career just won't persist.
  }
}

export function clearCareer(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}
