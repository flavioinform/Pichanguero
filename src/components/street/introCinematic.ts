/**
 * Cámara y jugadores de la animación de inicio (solo se dibuja: la lógica del
 * partido no se entera). Las medidas están en metros del mundo 3D: la cancha va
 * de x = -15 a 15 y de z = -9 a 9; la reja del fondo está en z = -9 y los
 * edificios detrás, hasta z = -26.
 */
import * as THREE from 'three';
import { COURT } from '../../lib/street/engine';
import { STREET } from '../../config/gameConfig';

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
const range = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));

// ---------------------------------------------------------------- cámara

/** Puntos por los que pasa la cámara (posición) y hacia donde mira, en orden.
 * Para cambiar el recorrido, mové estos números. */
const CAMERA_STOPS: Array<{ pos: [number, number, number]; look: [number, number, number] }> = [
  // 1. abajo a la izquierda, mirando hacia arriba los edificios iluminados
  { pos: [-13, 3.0, 12], look: [-5, 11, -24] },
  // 2. el público de la izquierda, pegado a la reja
  { pos: [-8, 3.6, 7], look: [-6, 2.4, -11] },
  // 3. el paneo termina en el público de la derecha
  { pos: [8, 3.6, 7], look: [6, 2.4, -11] },
  // 4. baja hacia la cancha, casi a la altura de la cámara de juego
  { pos: [5, 8.5, 14], look: [1, 1.3, -1.5] },
];

const positionCurve = new THREE.CatmullRomCurve3(
  CAMERA_STOPS.map((k) => new THREE.Vector3(...k.pos)),
  false,
  'centripetal'
);
const lookCurve = new THREE.CatmullRomCurve3(
  CAMERA_STOPS.map((k) => new THREE.Vector3(...k.look)),
  false,
  'centripetal'
);

export interface CameraPose {
  position: THREE.Vector3;
  look: THREE.Vector3;
  fov: number;
}

/** Cámara de la intro larga. `t` va de 0 (inicio) a 1 (fin). Los últimos pasos se
 * funden con la cámara de juego (`play`), así que al terminar no hay ningún salto. */
export function introCameraAt(t: number, play: CameraPose, out: CameraPose): CameraPose {
  // arranque y llegada suaves, el centro del recorrido a velocidad pareja
  const u = clamp01(0.4 * smooth(t) + 0.6 * t);
  positionCurve.getPoint(u, out.position);
  lookCurve.getPoint(u, out.look);
  // empieza con lente más abierta y se va cerrando
  out.fov = 54 + (38 - 54) * smooth(range(t, 0.35, 1));

  const w = smooth(range(t, 0.78, 1));
  out.position.lerp(play.position, w);
  out.look.lerp(play.look, w);
  out.fov += (play.fov - out.fov) * w;
  return out;
}

/** Mezcla dos poses de cámara (para acomodarse a la cámara de juego tras saltar la intro). */
export function blendCamera(from: CameraPose, to: CameraPose, w: number, out: CameraPose): CameraPose {
  out.position.lerpVectors(from.position, to.position, w);
  out.look.lerpVectors(from.look, to.look, w);
  out.fov = from.fov + (to.fov - from.fov) * w;
  return out;
}

// ---------------------------------------------------------------- jugadores

/** 'greet': el jugador hace el gesto de entrada que eligió en su equipo */
export type IntroGesture = 'none' | 'greet';

export interface IntroPose {
  /** posición en píxeles del motor */
  x: number;
  y: number;
  /** metros por segundo, para animar las piernas */
  speed: number;
  /** hacia dónde mira */
  dx: number;
  dy: number;
  gesture: IntroGesture;
}

/** Dónde se para cada jugador para el saludo: el equipo 0 a la izquierda del círculo central, el 1 a la derecha. */
function lineupSpot(team: 0 | 1, role: number): [number, number] {
  const x = COURT.w / 2 + (team === 0 ? -70 : 70);
  const y = COURT.h / 2 + (role - 1) * 74;
  return [x, y];
}

/** Desde dónde sale trotando cada uno: cerca de su arco. */
function entrySpot(team: 0 | 1, role: number): [number, number] {
  const [, y] = lineupSpot(team, role);
  return [team === 0 ? 70 : COURT.w - 70, COURT.h / 2 + (y - COURT.h / 2) * 0.45];
}

const PX_TO_M = 30 / COURT.w;

/** Qué hace un jugador a los `elapsedMs` de la intro larga: entrar, saludar y volver a su lugar de saque. */
export function introPlayerPose(team: 0 | 1, role: number, index: number, elapsedMs: number, home: [number, number]): IntroPose {
  const t = STREET.intro;
  const lineup = lineupSpot(team, role);
  const entry = entrySpot(team, role);
  const facing = team === 0 ? 1 : -1;
  const delay = index * t.entry.staggerMs;

  const moving = (from: [number, number], to: [number, number], e: number, durMs: number): IntroPose => {
    const k = smooth(e);
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const dist = Math.hypot(dx, dy) || 1;
    // la velocidad se reparte según cuánto avanza la curva suavizada en este momento
    const slope = 6 * e * (1 - e);
    const speed = (dist * PX_TO_M * slope) / (durMs / 1000);
    return { x: from[0] + dx * k, y: from[1] + dy * k, speed: Math.max(speed, e > 0 && e < 1 ? 1.4 : 0), dx: dx / dist, dy: dy / dist, gesture: 'none' };
  };

  // todavía no salió: espera en su arco mirando al centro
  if (elapsedMs < t.entry.startMs + delay) return { x: entry[0], y: entry[1], speed: 0, dx: facing, dy: 0, gesture: 'none' };

  // entrada trotando
  const entryDur = t.entry.endMs - t.entry.startMs - delay * 0.5;
  const e = clamp01((elapsedMs - t.entry.startMs - delay) / entryDur);
  if (e < 1) return moving(entry, lineup, e, entryDur);

  // saludo: el equipo 0 choca las manos, el equipo 1 señala al cielo
  if (elapsedMs < t.back.startMs) {
    return { x: lineup[0], y: lineup[1], speed: 0, dx: facing, dy: 0, gesture: 'greet' };
  }

  // vuelta a la posición de saque
  const backDur = t.back.endMs - t.back.startMs;
  const b = clamp01((elapsedMs - t.back.startMs) / backDur);
  if (b < 1) return moving(lineup, home, b, backDur);

  return { x: home[0], y: home[1], speed: 0, dx: facing, dy: 0, gesture: 'none' };
}
