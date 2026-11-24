/**
 * Sonidos cortos del menú, hechos con Web Audio (sin archivos). El navegador
 * solo deja sonar después de un clic o una tecla, y los menús siempre arrancan
 * con uno, así que no hay que "desbloquear" nada aparte. Respeta el ajuste de sonido.
 */
import { loadSettings } from '../../../lib/street/settings';

let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (!loadSettings().sound) return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function blip(from: number, to: number, ms: number, gain: number, type: 'square' | 'triangle' | 'sine', delayMs = 0) {
  const c = context();
  if (!c) return;
  const t = c.currentTime + delayMs / 1000;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + ms / 1000);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + ms / 1000);
  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + ms / 1000 + 0.02);
}

/** 'select': mover o elegir una opción. 'confirm': aceptar. 'back': volver. */
export function menuSound(kind: 'select' | 'confirm' | 'back'): void {
  if (kind === 'select') blip(620, 840, 70, 0.07, 'triangle');
  else if (kind === 'confirm') {
    blip(520, 780, 110, 0.1, 'square');
    blip(780, 1170, 150, 0.1, 'square', 90);
  } else blip(520, 330, 120, 0.08, 'triangle');
}
