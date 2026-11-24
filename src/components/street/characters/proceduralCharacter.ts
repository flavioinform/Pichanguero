/**
 * El personaje armado por código (plan B mientras no haya .glb). Toma lo que
 * está haciendo el jugador (MotionState) y lo convierte en ángulos de cadera,
 * rodilla, hombro y codo.
 */
import type { PlayerCustom } from '../../../lib/street/team';
import { applyPose, buildPlayerModel, celebrationPose, entryGesturePose, idlePose, type PlayerRig, type PoseValues, type TeamColors } from '../playerModel';
import type { MotionState, StreetCharacter } from './types';

/** Interpola una curva hecha de puntos (tiempo, valor). */
function curve(t: number, keys: Array<[number, number]>): number {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1] = keys[i];
    const [t0, v0] = keys[i - 1];
    if (t <= t1) {
      const k = (t - t0) / Math.max(1e-6, t1 - t0);
      const e = k * k * (3 - 2 * k);
      return v0 + (v1 - v0) * e;
    }
  }
  return keys[keys.length - 1][1];
}

/**
 * La patada en el tiempo: lleva la pierna hacia atrás en la preparación, la
 * cruza justo en el contacto (cuando sale la pelota) y termina el movimiento.
 * Los tiempos vienen del motor, así que el pie y la pelota coinciden.
 */
function kickOverrides(kick: NonNullable<MotionState['kick']>): Partial<PoseValues> {
  const { t, contact: c, follow: f } = kick;
  const a = kick.kind === 'shot' ? 1 : 0.72;
  const k = (keys: Array<[number, number]>) => curve(t, keys.map(([tt, v]) => [tt, v * a] as [number, number]));
  return {
    hipR: k([[0, 0], [c * 0.55, 0.78], [c, -0.35], [c + 0.1, -1.3], [c + f, 0]]),
    kneeR: k([[0, 0.1], [c * 0.55, 1.4], [c, 0.3], [c + 0.1, 0.15], [c + f, 0.1]]),
    hipL: k([[0, 0], [c * 0.55, -0.12], [c, 0.18], [c + 0.1, 0.25], [c + f, 0]]),
    kneeL: 0.12 + k([[0, 0], [c, 0.25], [c + f, 0]]),
    shoulderL: k([[0, 0], [c * 0.55, 0.45], [c, -0.7], [c + 0.1, -0.9], [c + f, 0]]),
    spreadL: -0.1 + k([[0, 0], [c, -0.5], [c + 0.1, -0.6], [c + f, 0]]),
    shoulderR: k([[0, 0], [c * 0.55, -0.5], [c, 0.5], [c + f, 0]]),
    lean: k([[0, 0], [c * 0.55, 0.1], [c, -0.12], [c + 0.1, -0.16], [c + f, 0]]),
  };
}

export class ProceduralCharacter implements StreetCharacter {
  readonly kind = 'procedural' as const;
  readonly object;
  readonly rig: PlayerRig;
  private phase = 0;

  constructor(custom: PlayerCustom, team: TeamColors) {
    this.rig = buildPlayerModel(custom, team);
    this.object = this.rig.root;
    this.phase = (custom.number * 0.7) % 6;
  }

  update(dt: number, m: MotionState, time: number, seed: number): void {
    const effort = Math.min(1, m.speed / 4.5);
    this.phase += m.speed * dt * 2.1 + dt * 0.9;
    const stride = Math.sin(this.phase);

    // corriendo: caderas alternadas, la rodilla de atrás se dobla, brazos que bombean con el codo doblado
    const rest = idlePose(time, seed);
    const v: PoseValues = {
      ...rest,
      hipL: stride * 0.85 * effort,
      hipR: -stride * 0.85 * effort,
      kneeL: (0.18 + Math.max(0, Math.sin(this.phase - 1.9)) * 1.35) * effort + 0.05,
      kneeR: (0.18 + Math.max(0, Math.sin(this.phase - 1.9 + Math.PI)) * 1.35) * effort + 0.05,
      shoulderL: -stride * 0.8 * effort,
      shoulderR: stride * 0.8 * effort,
      elbowL: -(0.22 + effort * 1.15),
      elbowR: -(0.22 + effort * 1.15),
      lean: effort * 0.22,
      lift: Math.abs(Math.cos(this.phase)) * 0.045 * effort + rest.lift * (1 - effort),
    };

    if (m.brake) {
      // frenando: el cuerpo atrás y las piernas abiertas para clavar los pies
      v.lean = -0.18;
      v.hipL = 0.35;
      v.hipR = -0.25;
      v.kneeL = 0.35;
      v.kneeR = 0.2;
    }
    if (m.kick) Object.assign(v, kickOverrides(m.kick));
    if (m.trick !== null && m.trickKind === 'cola') {
      // cola de vaca: estira la pierna, pisa la pelota y la arrastra para atrás (el giro lo da quien lo mira)
      const t = m.trick;
      v.hipR = curve(t, [[0, 0], [0.25, -0.75], [0.6, 0.45], [1, 0]]);
      v.kneeR = curve(t, [[0, 0.1], [0.25, 0.15], [0.6, 0.7], [1, 0.1]]);
      v.hipL = -0.15;
      v.kneeL = 0.35;
      v.lean = 0.12;
      v.spreadL = -0.7;
      v.spreadR = 0.7;
    } else if (m.trick !== null) {
      // gambeta: un giro rápido sobre la pelota con los brazos abiertos
      v.spin = m.trick * Math.PI * 2;
      v.lift += Math.sin(m.trick * Math.PI) * 0.14;
      v.spreadL = -1.0;
      v.spreadR = 1.0;
      v.elbowL = v.elbowR = -0.4;
    }
    let down = m.down;
    if (m.slide !== null) {
      // barrida: se tira para atrás con la pierna derecha estirada hacia la pelota y la otra doblada abajo
      const lay = curve(m.slide, [[0, 0], [0.1, 1], [0.56, 1], [0.85, 0.2], [1, 0]]);
      v.hipR = -0.35 * lay;
      v.kneeR = 0.05;
      v.hipL = 0.25 * lay;
      v.kneeL = 1.5 * lay;
      v.spreadL = -0.9 * lay;
      v.spreadR = 0.6 * lay;
      v.elbowL = v.elbowR = -0.3;
      down = Math.max(down, 0.5 * lay);
    }
    if (m.greet) Object.assign(v, entryGesturePose(m.greet, time, seed));
    if (m.celebrate) {
      Object.assign(v, { hipL: 0, hipR: 0, kneeL: 0.25, kneeR: 0.25, shoulderL: 0, shoulderR: 0 }, celebrationPose(m.celebrate, time, seed));
    } else if (m.sulk) {
      v.lean = 0.22;
      v.shoulderL = v.shoulderR = 0.1;
      v.elbowL = v.elbowR = -0.1;
    }
    if (m.down > 0.5) {
      // en el piso después de un caño, pateando el aire
      v.hipL = -1.0 + Math.sin(time * 9) * 0.25;
      v.hipR = -0.7 - Math.sin(time * 9) * 0.25;
      v.kneeL = v.kneeR = 0.9;
      v.spreadL = -1.2;
      v.spreadR = 1.2;
    }
    // hacia dónde mira lo maneja quien lo usa: acá solo se suma el giro propio (gambeta, celebración)
    this.rig.angle = 0;
    applyPose(this.rig, v, down);
  }

  dispose(): void {
    this.object.traverse((o) => {
      const mesh = o as import('three').Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.dispose();
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of mats) {
        if (mat.side === 1 /* BackSide: el contorno compartido */) continue;
        (mat as import('three').MeshBasicMaterial).map?.dispose();
        mat.dispose();
      }
    });
  }
}
