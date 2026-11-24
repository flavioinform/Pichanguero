/**
 * Línea de tiempo de la animación de inicio. Es lógica pura (sin dibujo): la
 * usan la escena 3D (cámara y jugadores), la interfaz (tarjetas y cuenta
 * regresiva) y el sonido. Todos los tiempos salen de STREET.intro en
 * src/config/gameConfig.ts: ahí se ajustan.
 */
import { STREET } from '../../config/gameConfig';
import type { StreetState } from './engine';

/** Milisegundos que lleva corriendo la intro (0 si no hay intro). */
export function introElapsed(s: StreetState): number {
  return s.phase === 'intro' ? Math.max(0, s.introTotalMs - s.phaseMs) : 0;
}

/** El cartel grande del centro: "3", "2", "1", "¡POTRERO!" (o "¡LISTOS!" / "¡YA!" en la versión corta). */
export function introLabel(kind: StreetState['introKind'], elapsedMs: number): string | null {
  const t = STREET.intro;
  if (kind === 'restart') return elapsedMs < t.restartReadyMs ? '¡LISTOS!' : '¡YA!';
  if (elapsedMs < t.countdown.startMs) return null;
  const beat = Math.floor((elapsedMs - t.countdown.startMs) / t.countdown.beatMs);
  return ['3', '2', '1'][beat] ?? '¡POTRERO!';
}

/** true mientras suena el último cartel (el que da el pitazo de salida). */
export function isGoLabel(label: string | null): boolean {
  return label === '¡POTRERO!' || label === '¡YA!';
}
