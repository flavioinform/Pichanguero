/**
 * El jugador 3D de POTRERO: un cuerpo articulado (cadera, rodilla, hombro y
 * codo son grupos que se rotan por código) armado a partir de un
 * PlayerCustom, es decir, de lo que elegiste en "Mi equipo". Lo usan el
 * partido (scene3d.ts) y la vista previa del menú (TeamPreview3d.tsx), así que
 * lo que ves en el menú es exactamente lo que juega.
 */
import * as THREE from 'three';
import { readableOn } from '../../lib/countryVisuals';
import type { Celebration, EntryGesture, PlayerCustom } from '../../lib/street/team';
import { addRim } from './characters/looks';

/** Los jugadores se dibujan un poco más grandes que la vida real para que se lean bien desde la cámara de TV. */
export const PLAYER_SCALE = 1.22;

const HEIGHT_SCALE = [0.93, 1, 1.08] as const;
const BUILD_SCALE = [0.9, 1, 1.12] as const;
/** color del contorno oscuro */
const OUTLINE_COLOR = '#0b0d11';

export interface PlayerRig {
  root: THREE.Group;
  body: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  kneeL: THREE.Group;
  kneeR: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  elbowL: THREE.Group;
  elbowR: THREE.Group;
  crackRing: THREE.Mesh;
  phase: number;
  angle: number;
  kickT: number;
  prevPickupCd: number;
  down: number;
}

export interface TeamColors {
  primary: string;
  secondary: string;
}

export function numberTexture(n: number, color: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.font = '900 50px Impact, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.strokeText(String(n), 32, 35);
  ctx.fillStyle = color;
  ctx.fillText(String(n), 32, 35);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const outlineMaterial = new THREE.MeshBasicMaterial({ color: OUTLINE_COLOR, side: THREE.BackSide });

/** Contorno oscuro fino: una copia un poquito más grande, dada vuelta, detrás de la pieza. */
function outlined<T extends THREE.Mesh>(mesh: T, thickness = 1.07): T {
  const shell = new THREE.Mesh(mesh.geometry, outlineMaterial);
  shell.scale.setScalar(thickness);
  mesh.add(shell);
  return mesh;
}

/** Arma el jugador. `team` son los colores del equipo; la camiseta sale de ahí salvo que el jugador tenga su propio color. */
export function buildPlayerModel(custom: PlayerCustom, team: TeamColors): PlayerRig {
  const jerseyColor = custom.shirtColor ?? team.primary;
  // luz de borde del color del equipo en todo el cuerpo, para separarlo del fondo
  const rimmed = (color: string) => addRim(new THREE.MeshLambertMaterial({ color }), team.primary);
  const skin = rimmed(custom.skin);
  const hair = rimmed(custom.hairColor);
  const jersey = rimmed(jerseyColor);
  const trim = rimmed(team.secondary);
  const shortsMat = rimmed(team.secondary);
  const boot = rimmed(custom.shoeColor);
  const sole = new THREE.MeshLambertMaterial({ color: '#f1efe8' });
  const dark = new THREE.MeshBasicMaterial({ color: '#15171c' });
  const h = HEIGHT_SCALE[custom.height];
  const b = BUILD_SCALE[custom.build];

  const root = new THREE.Group();
  const body = new THREE.Group();
  body.scale.set(b * PLAYER_SCALE, h * PLAYER_SCALE, b * PLAYER_SCALE);
  root.add(body);

  /** una cápsula que cuelga del origen de su padre */
  const part = (parent: THREE.Object3D, radius: number, length: number, mat: THREE.Material, y = 0, line = true) => {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 4, 10), mat);
    m.position.y = y - length / 2;
    m.castShadow = true;
    if (line) outlined(m);
    parent.add(m);
    return m;
  };

  /** una esfera chica que tapa la unión entre dos piezas (así las extremidades no se ven sueltas) */
  const joint = (parent: THREE.Object3D, radius: number, mat: THREE.Material, y: number) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 9), mat);
    m.position.y = y;
    m.castShadow = true;
    parent.add(m);
    return m;
  };

  const shortsLen = { corto: 0.1, medio: 0.2, largo: 0.3 }[custom.shorts];
  const makeLeg = (side: number) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.1, 0.94, 0);
    part(hip, 0.08, 0.34, skin, -0.04);
    part(hip, 0.094, shortsLen, shortsMat, 0.02, false); // la pierna del short
    const knee = new THREE.Group();
    knee.position.y = -0.45;
    hip.add(knee);
    joint(knee, 0.066, skin, 0);
    part(knee, 0.06, 0.3, skin, -0.02);
    // calcetas altas cubren la canilla; bajas, solo el tobillo
    if (custom.socks === 'altas') part(knee, 0.066, 0.2, trim, -0.14, false);
    else part(knee, 0.066, 0.05, trim, -0.31, false);
    // zapatilla grande: capellada del color elegido sobre una suela clara
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.085, 0.29), boot);
    shoe.position.set(0, -0.428, 0.07);
    shoe.castShadow = true;
    knee.add(outlined(shoe, 1.1));
    const toe = new THREE.Mesh(new THREE.SphereGeometry(0.062, 10, 8), boot);
    toe.position.set(0, -0.44, 0.19);
    toe.scale.set(1, 0.7, 1);
    knee.add(toe);
    const soleMesh = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.03, 0.33), sole);
    soleMesh.position.set(0, -0.48, 0.085);
    knee.add(outlined(soleMesh, 1.08));
    body.add(hip);
    return { hip, knee };
  };
  const left = makeLeg(-1);
  const right = makeLeg(1);

  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 0.22), shortsMat);
  pelvis.position.y = 0.97;
  pelvis.castShadow = true;
  body.add(pelvis);

  // torso en V: pecho ancho arriba y cintura más angosta abajo.
  // camiseta normal, suelta (ancha y larga, sobre el short) o con las mangas cortadas
  const shape = {
    normal: { chest: [1.2, 1, 0.74], waist: [1.02, 1, 0.72], waistY: 1.13, sleeve: 0.1, sleeveR: 0.064 },
    suelta: { chest: [1.44, 1.06, 0.9], waist: [1.36, 1.12, 0.88], waistY: 1.06, sleeve: 0.17, sleeveR: 0.08 },
    cortada: { chest: [1.16, 1, 0.72], waist: [0.98, 1, 0.7], waistY: 1.13, sleeve: 0, sleeveR: 0 },
  }[custom.shirt];
  const chest = new THREE.Mesh(new THREE.CapsuleGeometry(0.165, 0.2, 6, 14), jersey);
  chest.position.y = 1.36;
  chest.scale.set(...(shape.chest as [number, number, number]));
  chest.castShadow = true;
  body.add(outlined(chest));
  const waist = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.16, 6, 14), jersey);
  waist.position.y = shape.waistY;
  waist.scale.set(...(shape.waist as [number, number, number]));
  waist.castShadow = true;
  body.add(outlined(waist));

  const numberColor = readableOn(jerseyColor);
  const numberMat = new THREE.MeshBasicMaterial({ map: numberTexture(custom.number, numberColor), transparent: true });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), numberMat);
  back.position.set(0, 1.31, -0.17 * shape.chest[2] - 0.006);
  back.rotation.y = Math.PI;
  body.add(back);

  const shoulderX = 0.225 * (shape.chest[0] / 1.2) + 0.02;
  const makeArm = (side: number) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * shoulderX, 1.47, 0);
    // el hombro: redondo, del color de la camiseta (o piel si las mangas están cortadas)
    joint(shoulder, 0.068, shape.sleeve > 0 ? jersey : skin, 0);
    part(shoulder, 0.054, 0.2, skin, -0.04);
    if (shape.sleeve > 0) part(shoulder, shape.sleeveR, shape.sleeve, jersey, 0.02, false);
    const elbow = new THREE.Group();
    elbow.position.y = -0.29;
    shoulder.add(elbow);
    joint(elbow, 0.05, skin, 0);
    part(elbow, 0.045, 0.2, skin, -0.02);
    // manos algo grandes, como pide el estilo callejero
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.062, 10, 8), skin);
    hand.position.y = -0.3;
    hand.scale.set(0.85, 1.15, 0.7);
    hand.castShadow = true;
    elbow.add(outlined(hand, 1.08));
    body.add(shoulder);
    return { shoulder, elbow };
  };
  const armLeft = makeArm(-1);
  const armRight = makeArm(1);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.062, 0.12, 10), skin);
  neck.position.y = 1.57;
  body.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.112, 18, 14), skin);
  head.position.y = 1.7;
  head.scale.set(0.95, 1.16, 1.02);
  head.castShadow = true;
  body.add(outlined(head, 1.05));
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 5), skin);
  nose.position.set(0, 1.688, 0.116);
  body.add(nose);
  // ojos y cejas para que la cara se lea de lejos
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 5), dark);
    eye.position.set(side * 0.041, 1.715, 0.1);
    body.add(eye);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.009, 0.01), hair);
    brow.position.set(side * 0.041, 1.74, 0.104);
    body.add(brow);
  }

  if (custom.beard) {
    const beard = new THREE.Mesh(new THREE.SphereGeometry(0.072, 10, 8), hair);
    beard.position.set(0, 1.645, 0.058);
    beard.scale.set(1.25, 0.85, 0.9);
    body.add(beard);
    const mustache = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.014, 0.012), hair);
    mustache.position.set(0, 1.672, 0.108);
    body.add(mustache);
  }

  // peinado
  const cap = (radius = 0.118, scaleY = 1.16, y = 1.715, material: THREE.Material = hair) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.56), material);
    m.position.set(0, y, -0.012);
    m.scale.set(0.97, scaleY, 1.05);
    m.castShadow = true;
    body.add(m);
    return m;
  };
  switch (custom.hairStyle) {
    case 'corto':
      cap();
      break;
    case 'afro': {
      const afro = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10), hair);
      afro.position.set(0, 1.83, -0.045);
      afro.scale.set(1.04, 0.92, 0.95);
      afro.castShadow = true;
      body.add(outlined(afro, 1.04));
      break;
    }
    case 'trenzas': {
      cap(0.119, 1.2);
      for (let i = -3; i <= 3; i++) {
        const braid = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.17 + (Math.abs(i) === 3 ? -0.04 : 0), 3, 6), hair);
        braid.position.set(i * 0.034, 1.62, -0.07 + Math.abs(i) * 0.004);
        braid.rotation.x = 0.12;
        body.add(braid);
      }
      break;
    }
    case 'gorro': {
      // gorro de lana en el color secundario del equipo
      const beanie = cap(0.128, 1.12, 1.717, trim);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.127, 0.127, 0.03, 18, 1, true), trim);
      brim.position.set(0, 1.725, -0.012);
      brim.scale.set(0.99, 1, 1.07);
      body.add(brim);
      void beanie;
      break;
    }
    case 'cinta': {
      cap(0.118, 1.12);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.121, 0.121, 0.032, 18, 1, true), trim);
      band.position.set(0, 1.745, -0.012);
      band.scale.set(0.98, 1, 1.07);
      body.add(band);
      break;
    }
    case 'rodete': {
      cap(0.118, 1.14);
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), hair);
      bun.position.set(0, 1.84, -0.07);
      body.add(bun);
      break;
    }
    case 'cresta': {
      const mohawk = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.1, 0.2), hair);
      mohawk.position.set(0, 1.82, -0.02);
      body.add(mohawk);
      break;
    }
    case 'rapado':
    default:
      break;
  }

  const crackRing = new THREE.Mesh(
    new THREE.RingGeometry(0.42, 0.6, 28),
    new THREE.MeshBasicMaterial({ color: '#ffd64a', transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide })
  );
  crackRing.rotation.x = -Math.PI / 2;
  crackRing.position.y = 0.03;
  crackRing.visible = false;
  root.add(crackRing);

  return {
    root,
    body,
    legL: left.hip,
    legR: right.hip,
    kneeL: left.knee,
    kneeR: right.knee,
    armL: armLeft.shoulder,
    armR: armRight.shoulder,
    elbowL: armLeft.elbow,
    elbowR: armRight.elbow,
    crackRing,
    phase: (custom.number * 0.7) % 6,
    angle: 0,
    kickT: 0,
    prevPickupCd: 0,
    down: 0,
  };
}

// ---------------------------------------------------------------- poses

/** Los ángulos (en radianes) de cada articulación en un instante. */
export interface PoseValues {
  hipL: number;
  hipR: number;
  kneeL: number;
  kneeR: number;
  shoulderL: number;
  shoulderR: number;
  /** abrir el brazo hacia el costado (izquierdo negativo, derecho positivo) */
  spreadL: number;
  spreadR: number;
  elbowL: number;
  elbowR: number;
  /** inclinación del torso hacia adelante */
  lean: number;
  /** cuánto se levanta del piso (puede ser negativo para agacharse) */
  lift: number;
  /** vuelta sobre sí mismo */
  spin: number;
}

/** De pie, con los brazos sueltos y una respiración lenta. */
export function idlePose(time: number, seed = 0): PoseValues {
  const breath = Math.sin(time * 1.8 + seed) * 0.02;
  return {
    hipL: 0, hipR: 0, kneeL: 0.05, kneeR: 0.05,
    shoulderL: 0, shoulderR: 0, spreadL: -0.09 - breath, spreadR: 0.09 + breath,
    elbowL: -0.22, elbowR: -0.22, lean: 0, lift: breath * 0.4, spin: 0,
  };
}

/** Lo que cambia en el cuerpo durante la celebración elegida. Se mezcla encima de la pose base. */
export function celebrationPose(kind: Celebration, time: number, seed: number): Partial<PoseValues> {
  const t = time + seed * 0.37;
  switch (kind) {
    case 'salto':
      // salta alto y da una vuelta entera, con los brazos arriba
      return {
        lift: Math.abs(Math.sin(t * 4.2)) * 0.7, spin: t * 5.5,
        spreadL: -2.7, spreadR: 2.7, shoulderL: 0, shoulderR: 0, elbowL: -0.2, elbowR: -0.2,
        hipL: 0.2, hipR: -0.2, kneeL: 0.7, kneeR: 0.7, lean: 0,
      };
    case 'baile':
      // baile de cadera: brazos que se turnan y giro corto
      return {
        lift: Math.abs(Math.sin(t * 8)) * 0.07, lean: Math.sin(t * 4) * 0.12, spin: Math.sin(t * 2.6) * 0.7,
        shoulderL: Math.sin(t * 8) * 1.2, shoulderR: -Math.sin(t * 8) * 1.2, spreadL: -0.8, spreadR: 0.8,
        elbowL: -1.2, elbowR: -1.2, hipL: Math.sin(t * 8) * 0.32, hipR: -Math.sin(t * 8) * 0.32, kneeL: 0.25, kneeR: 0.25,
      };
    case 'rodillas':
      // se tira de rodillas con los brazos abiertos
      return {
        lift: -0.4, lean: -0.22, spreadL: -2.35, spreadR: 2.35, shoulderL: 0, shoulderR: 0, elbowL: -0.25, elbowR: -0.25,
        hipL: -1.5, kneeL: 1.55, hipR: 0.15, kneeR: 2.2,
      };
    case 'brazos':
    default:
      return {
        lift: Math.abs(Math.sin(t * 7)) * 0.4, spreadL: -2.75, spreadR: 2.75, shoulderL: 0, shoulderR: 0,
        elbowL: -0.25, elbowR: -0.25, hipL: 0, hipR: 0, kneeL: 0.25 * Math.abs(Math.cos(t * 7)), kneeR: 0.25 * Math.abs(Math.cos(t * 7)), lean: -0.08,
      };
  }
}

/** El gesto con el que cada jugador entra a la cancha. */
export function entryGesturePose(kind: EntryGesture, time: number, seed: number): Partial<PoseValues> {
  const t = time + seed * 0.4;
  switch (kind) {
    case 'cielo':
      return { spreadR: 2.85, shoulderR: 0, elbowR: -0.12, lift: Math.abs(Math.sin(t * 6)) * 0.12, lean: -0.1 };
    case 'saludo':
      // levanta la mano y saluda moviendo el antebrazo
      return { spreadR: 2.15, shoulderR: 0, elbowR: -0.7 + Math.sin(t * 11) * 0.45, lean: -0.05, lift: Math.abs(Math.sin(t * 3)) * 0.03 };
    case 'giro':
      // un giro con los brazos abiertos
      return { spin: ((t * 1.6) % 1) * Math.PI * 2, spreadL: -1.1, spreadR: 1.1, elbowL: -0.3, elbowR: -0.3, lift: 0.1 };
    case 'choque':
    default: {
      const clap = Math.sin(t * 9);
      return { shoulderR: -2.3 + clap * 0.18, spreadR: 0.35, elbowR: -0.15, lift: Math.abs(clap) * 0.05, lean: -0.04 };
    }
  }
}

/** Pone las articulaciones del jugador en la pose. `down` (0 a 1) es cuánto está tirado en el piso. */
export function applyPose(rig: PlayerRig, v: PoseValues, down = 0): void {
  rig.legL.rotation.x = v.hipL;
  rig.legR.rotation.x = v.hipR;
  rig.kneeL.rotation.x = v.kneeL;
  rig.kneeR.rotation.x = v.kneeR;
  rig.armL.rotation.set(v.shoulderL, 0, v.spreadL);
  rig.armR.rotation.set(v.shoulderR, 0, v.spreadR);
  rig.elbowL.rotation.x = v.elbowL;
  rig.elbowR.rotation.x = v.elbowR;
  rig.root.rotation.y = rig.angle + v.spin;
  rig.body.rotation.x = v.lean * (1 - down) - (Math.PI / 2) * down;
  rig.body.position.y = v.lift * (1 - down) + 0.17 * down;
}
