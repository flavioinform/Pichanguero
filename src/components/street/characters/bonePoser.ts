/**
 * Poses armadas por código para un .glb que no trae todas las animaciones
 * (por ejemplo, uno que solo tiene caminar y correr). En vez de depender de
 * cómo está orientado cada hueso por dentro, cada giro se da sobre los ejes
 * del cuerpo: X = de hombro a hombro, Y = hacia arriba, Z = hacia adelante.
 * Con el personaje mirando a +Z:
 *   - un giro positivo en X lleva hacia adelante lo que apunta arriba (inclinar
 *     el torso) y hacia atrás lo que apunta abajo (pierna atrás, rodilla doblada);
 *   - un giro positivo en Z sube el brazo izquierdo y baja el derecho.
 * Los huesos se buscan por los nombres de STREET_CHARACTER.poseBones.
 */
import * as THREE from 'three';
import type { Celebration, EntryGesture } from '../../../lib/street/team';

export type BoneKey =
  | 'hips' | 'spineLow' | 'spineMid' | 'chest' | 'neck' | 'head'
  | 'armL' | 'foreArmL' | 'armR' | 'foreArmR'
  | 'thighL' | 'shinL' | 'footL' | 'thighR' | 'shinR' | 'footR';

/** Una pose: giros por hueso (en radianes, ejes del cuerpo) y cómo se mueve el cuerpo entero. */
export interface Pose {
  rot: Partial<Record<BoneKey, [number, number, number]>>;
  /** subir o bajar el cuerpo, en alturas del jugador (0.1 = un décimo de lo que mide) */
  lift: number;
  /** giro de todo el cuerpo sobre sí mismo (radianes) */
  spin: number;
  /** tumbarse hacia atrás (radianes; -π/2 = acostado boca arriba) */
  tilt: number;
}

interface Joint {
  bone: THREE.Bone;
  key: BoneKey | null;
  restQ: THREE.Quaternion;
  restP: THREE.Vector3;
  restS: THREE.Vector3;
  /** orientación del hueso en reposo, vista desde el cuerpo, y su inversa */
  w: THREE.Quaternion;
  wInv: THREE.Quaternion;
}

const tmpQ = new THREE.Quaternion();
const tmpR = new THREE.Quaternion();
const tmpE = new THREE.Euler();

export class BonePoser {
  private joints: Joint[] = [];
  private byKey = new Map<BoneKey, Joint>();

  /** Hay que crearlo con el modelo quieto en su pose de reposo. */
  constructor(model: THREE.Object3D, names: Record<BoneKey, string>) {
    model.updateMatrixWorld(true);
    const modelInv = model.getWorldQuaternion(new THREE.Quaternion()).invert();
    const lower = new Map(Object.entries(names).map(([k, n]) => [n.toLowerCase(), k as BoneKey]));
    model.traverse((o) => {
      const bone = o as THREE.Bone;
      if (!bone.isBone) return;
      const w = modelInv.clone().multiply(bone.getWorldQuaternion(new THREE.Quaternion()));
      let key = lower.get(bone.name.toLowerCase()) ?? null;
      if (key && this.byKey.has(key)) key = null;
      const joint: Joint = { bone, key, restQ: bone.quaternion.clone(), restP: bone.position.clone(), restS: bone.scale.clone(), w, wInv: w.clone().invert() };
      this.joints.push(joint);
      if (key) this.byKey.set(key, joint);
    });
  }

  /** cuántos de los huesos pedidos encontró (para saber si el esqueleto sirve) */
  get found(): number {
    return this.byKey.size;
  }

  /** Todo el esqueleto a su pose de reposo (antes de que el mixer ponga la animación encima). */
  reset(): void {
    for (const j of this.joints) {
      j.bone.quaternion.copy(j.restQ);
      j.bone.position.copy(j.restP);
      j.bone.scale.copy(j.restS);
    }
  }

  /** Lleva el esqueleto hacia la pose; `weight` 1 la pone entera, 0 deja lo que había. */
  blend(pose: Pose, weight: number): void {
    if (weight <= 0) return;
    for (const j of this.joints) {
      const r = j.key ? pose.rot[j.key] : undefined;
      // reposo local · (giro en ejes del cuerpo, llevado a los ejes del hueso)
      tmpQ.copy(j.restQ);
      if (r) {
        tmpR.setFromEuler(tmpE.set(r[0], r[1], r[2], 'XYZ'));
        tmpQ.multiply(j.wInv).multiply(tmpR).multiply(j.w);
      }
      if (weight >= 1) j.bone.quaternion.copy(tmpQ);
      else j.bone.quaternion.slerp(tmpQ, weight);
      j.bone.position.lerp(j.restP, weight);
      j.bone.scale.lerp(j.restS, weight);
    }
  }
}

// ------------------------------------------------------------------ poses

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
/** valor de una curva por tramos [momento, valor] en el punto s (suavizado entre tramos) */
function curve(keys: Array<[number, number]>, s: number): number {
  if (s <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1] = keys[i];
    const [t0, v0] = keys[i - 1];
    if (s <= t1) return v0 + (v1 - v0) * smooth((s - t0) / (t1 - t0));
  }
  return keys[keys.length - 1][1];
}

export const emptyPose = (): Pose => ({ rot: {}, lift: 0, spin: 0, tilt: 0 });

/**
 * Las poses del juego. `armsDown` es cuánto hay que bajar los brazos desde la
 * pose de reposo del modelo (los modelos suelen venir en "A" o en "T").
 */
export function makePoses(armsDown: number) {
  /** brazos al costado del cuerpo con los codos apenas doblados */
  const relaxed = (extraL = 0, extraR = 0): Pose['rot'] => ({
    armL: [0, 0, -armsDown + extraL],
    armR: [0, 0, armsDown - extraR],
    foreArmL: [-0.25, 0, 0],
    foreArmR: [-0.25, 0, 0],
  });
  /** brazos arriba (ángulo desde el costado del cuerpo: π = derecho para arriba) */
  const raised = (aL: number, aR: number): Pose['rot'] => ({
    armL: [0, 0, -armsDown + aL],
    armR: [0, 0, armsDown - aR],
    foreArmL: [0, 0, 0],
    foreArmR: [0, 0, 0],
  });

  return {
    idle(time: number, seed: number, sulk: boolean): Pose {
      const breath = Math.sin(time * 1.6 + seed) * 0.025;
      const sway = Math.sin(time * 0.7 + seed * 2) * 0.03;
      const p = emptyPose();
      p.rot = {
        ...relaxed(0.06 + breath, 0.06 + breath),
        chest: [breath + (sulk ? 0.12 : 0), sway, 0],
        spineMid: [sulk ? 0.12 : 0, 0, 0],
        neck: [sulk ? 0.45 : 0, 0, 0],
        thighL: [-0.06, 0, 0.03],
        thighR: [-0.06, 0, -0.03],
        shinL: [0.12, 0, 0],
        shinR: [0.12, 0, 0],
      };
      p.lift = -0.004;
      return p;
    },

    /** patada con la derecha. s: 0 arranca, contacto en 0.4, 1 termina */
    kick(kind: 'pass' | 'shot', s: number): Pose {
      const shot = kind === 'shot';
      const thigh = curve([[0, 0], [0.25, shot ? 0.7 : 0.45], [0.4, -0.35], [0.65, shot ? -1.15 : -0.7], [1, 0]], s);
      const shin = curve([[0, 0.1], [0.25, shot ? 1.4 : 1.0], [0.4, 0.25], [0.65, 0.1], [1, 0.1]], s);
      const lean = curve([[0, 0], [0.25, 0.12], [0.5, shot ? -0.18 : -0.08], [1, 0]], s);
      // el pase sale con la cara interna del pie: la pierna gira hacia afuera
      const open = shot ? 0 : curve([[0, 0], [0.3, 0.5], [0.8, 0.5], [1, 0]], s);
      const p = emptyPose();
      p.rot = {
        ...relaxed(0.45, 0.2),
        armR: [0.35 * thigh, 0, armsDown - 0.25],
        spineMid: [lean, 0.15 * thigh, 0],
        thighR: [thigh, -open, 0],
        shinR: [shin, 0, 0],
        footR: [shot ? -0.35 : 0, 0, 0],
        thighL: [-0.15, 0, 0],
        shinL: [0.3, 0, 0],
      };
      p.lift = -0.02;
      return p;
    },

    /** gambeta: una vuelta sobre sí mismo pisando la pelota (p de 0 a 1) */
    trick(prog: number): Pose {
      const step = Math.sin(prog * Math.PI);
      const p = emptyPose();
      p.rot = {
        ...raised(0.25 + step * 0.4, 0.25 + step * 0.4),
        thighR: [-0.6 * step, 0, 0],
        shinR: [0.7 * step, 0, 0],
        thighL: [-0.1, 0, 0],
        shinL: [0.3, 0, 0],
        spineMid: [0.12, 0, 0],
      };
      p.spin = Math.PI * 2 * smooth(prog);
      p.lift = -0.015;
      return p;
    },

    /** cola de vaca: estira la derecha, pisa la pelota y la arrastra para atrás (el giro lo da la escena) */
    cola(prog: number): Pose {
      const p = emptyPose();
      p.rot = {
        ...raised(0.45, 0.45),
        thighR: [curve([[0, 0], [0.25, -0.75], [0.6, 0.45], [1, 0]], prog), 0, 0],
        shinR: [curve([[0, 0.1], [0.25, 0.2], [0.6, 0.75], [1, 0.1]], prog), 0, 0],
        footR: [curve([[0, 0], [0.25, -0.4], [0.6, 0.2], [1, 0]], prog), 0, 0],
        thighL: [-0.15, 0, 0],
        shinL: [0.35, 0, 0],
        spineMid: [0.15, 0, 0],
      };
      p.lift = -0.02;
      return p;
    },

    /** barrida: se tira para atrás deslizando, con la derecha estirada a la pelota (s de 0 a 1, se levanta al final) */
    slide(s: number): Pose {
      const lay = curve([[0, 0], [0.1, 1], [0.56, 1], [0.85, 0.2], [1, 0]], s);
      const p = emptyPose();
      p.rot = {
        // la izquierda en el piso de apoyo, la derecha suelta
        armL: [0.7 * lay, 0, -armsDown + 0.5 * lay],
        armR: [-0.4 * lay, 0, armsDown - 0.9 * lay],
        foreArmL: [-0.2, 0, 0],
        foreArmR: [-0.5 * lay, 0, 0],
        // el torso se dobla hacia adelante para mirar la pelota
        spineMid: [0.45 * lay, 0, 0],
        chest: [0.3 * lay, 0, 0],
        neck: [0.25 * lay, 0, 0],
        thighR: [-0.15 * lay, 0, 0],
        footR: [-0.3 * lay, 0, 0],
        // la izquierda doblada abajo del cuerpo
        thighL: [-1.0 * lay, 0, 0.15 * lay],
        shinL: [1.7 * lay, 0, 0],
      };
      // el cuerpo se acuesta hacia atrás apoyado en el pie de adelante
      p.tilt = -1.2 * lay;
      p.lift = 0.02 * lay;
      return p;
    },

    /** tirado boca arriba; down de 0 (parado) a 1 (en el piso) */
    fall(down: number): Pose {
      const p = emptyPose();
      p.rot = {
        ...raised(0.6 * down, 0.9 * down),
        thighL: [-0.35 * down, 0, 0.1],
        shinL: [0.6 * down, 0, 0],
        thighR: [-0.05 * down, 0, -0.1],
        neck: [0.3 * down, 0, 0],
      };
      p.tilt = (-Math.PI / 2) * down;
      p.lift = 0.06 * down;
      return p;
    },

    celebrate(kind: Celebration, time: number): Pose {
      const p = emptyPose();
      if (kind === 'salto') {
        const air = Math.abs(Math.sin(time * 3.2));
        p.rot = { ...raised(2.4, 2.4), thighL: [-0.5 * air, 0, 0], thighR: [-0.5 * air, 0, 0], shinL: [0.9 * air, 0, 0], shinR: [0.9 * air, 0, 0] };
        p.lift = 0.2 * air;
        p.spin = time * 3.2;
      } else if (kind === 'baile') {
        const b = Math.sin(time * 6);
        p.rot = {
          ...raised(1.2 + b * 0.6, 1.2 - b * 0.6),
          foreArmL: [-0.9, 0, 0],
          foreArmR: [-0.9, 0, 0],
          hips: [0, b * 0.35, 0],
          chest: [0, -b * 0.3, 0],
          thighL: [-0.2 - 0.15 * b, 0, 0],
          thighR: [-0.2 + 0.15 * b, 0, 0],
          shinL: [0.35, 0, 0],
          shinR: [0.35, 0, 0],
        };
        p.lift = -0.03 - 0.015 * Math.abs(b);
      } else if (kind === 'rodillas') {
        // de rodillas mirando al cielo: muslos rectos, canillas en el piso
        const pump = Math.sin(time * 5) * 0.15;
        p.rot = { ...raised(2.3 + pump, 2.3 + pump), thighL: [0, 0, 0.12], thighR: [0, 0, -0.12], shinL: [1.55, 0, 0], shinR: [1.55, 0, 0], spineMid: [-0.25, 0, 0], chest: [-0.15, 0, 0], neck: [-0.3, 0, 0] };
        p.lift = -0.25;
      } else {
        const pump = Math.sin(time * 7) * 0.2;
        p.rot = { ...raised(2.35 + pump, 2.35 - pump), spineMid: [-0.12, 0, 0], neck: [-0.2, 0, 0] };
        p.lift = 0.03 * Math.abs(Math.sin(time * 7));
      }
      return p;
    },

    greet(kind: EntryGesture, time: number): Pose {
      const p = emptyPose();
      if (kind === 'choque') {
        // puño adelante, como chocando con alguien
        const reach = 0.85 + Math.sin(time * 4) * 0.15;
        p.rot = { ...relaxed(0.06, 0), armR: [-1.45 * reach, 0, armsDown - 0.1], foreArmR: [-0.2, 0, 0] };
      } else if (kind === 'cielo') {
        p.rot = { ...relaxed(0.06, 0), armR: [-0.35, 0, armsDown - 2.6], foreArmR: [0, 0, 0], neck: [-0.35, 0, 0] };
      } else if (kind === 'giro') {
        p.rot = raised(0.9, 0.9);
        p.spin = time * 4;
      } else {
        // saludo con la mano
        const wave = Math.sin(time * 9) * 0.45;
        p.rot = { ...relaxed(0.06, 0), armR: [-0.2, 0, armsDown - 2.2], foreArmR: [0, 0, wave - 0.5] };
      }
      return p;
    },
  };
}
