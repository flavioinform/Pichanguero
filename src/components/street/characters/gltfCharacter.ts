/**
 * El personaje hecho con un modelo .glb: se clona del modelo cargado una sola
 * vez (SkeletonUtils.clone comparte geometría y texturas) y cada jugador tiene
 * su propio AnimationMixer. Las animaciones se mezclan entre sí (crossfade) y
 * la de carrera se acelera o frena según lo rápido que va el jugador, para que
 * los pies no patinen. Qué nombres tiene que tener el .glb: ver types.ts.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { STREET_CHARACTER } from '../../../config/gameConfig';
import { readableOn } from '../../../lib/countryVisuals';
import type { PlayerCustom } from '../../../lib/street/team';
import { numberTexture, PLAYER_SCALE, type TeamColors } from '../playerModel';
import { BonePoser, makePoses, type Pose } from './bonePoser';
import { addColorKey, addOutline, addRim, faceFrontZ } from './looks';
import type { MotionState, StreetCharacter } from './types';

/** El .glb ya cargado y preparado: el modelo de plantilla, sus clips y la escala para que mida lo que tiene que medir. */
export interface CharacterLibrary {
  template: THREE.Object3D;
  clips: Map<string, THREE.AnimationClip>;
  /** multiplica al modelo para que mida STREET_CHARACTER.heightM */
  scale: number;
}

const HEIGHT_SCALE = [0.93, 1, 1.08] as const;
const BUILD_SCALE = [0.9, 1, 1.12] as const;
/** clips que se reproducen una vez y se controlan a mano (la patada y la gambeta siguen el reloj del motor) */
const MANUAL = new Set(['pass', 'shot', 'trick']);

/** El primer material del .glb cuyo nombre tiene una de estas palabras define qué se pinta. */
const SLOTS: Array<{ words: string[]; color: (c: PlayerCustom, t: TeamColors) => string }> = [
  { words: ['jersey', 'camiseta', 'shirt'], color: (c, t) => c.shirtColor ?? t.primary },
  { words: ['shorts', 'short', 'pants'], color: (_, t) => t.secondary },
  { words: ['socks', 'calcetas', 'medias'], color: (_, t) => t.secondary },
  { words: ['skin', 'piel', 'body'], color: (c) => c.skin },
  { words: ['hair', 'pelo', 'beard'], color: (c) => c.hairColor },
  { words: ['shoes', 'zapatillas', 'boots'], color: (c) => c.shoeColor },
];

export class GltfCharacter implements StreetCharacter {
  readonly kind = 'gltf' as const;
  readonly object = new THREE.Group();
  /** el nombre del clip que se está viendo (sirve para revisar desde la consola) */
  activeClip = '';
  private model: THREE.Object3D;
  private mixer: THREE.AnimationMixer;
  private actions = new Map<string, THREE.AnimationAction>();
  private current: THREE.AnimationAction | null = null;
  private ownMaterials: THREE.Material[] = [];
  private ownGeometries: THREE.BufferGeometry[] = [];
  private numberMap: THREE.Texture | null = null;
  /** poses armadas por código para lo que el .glb no trae como clip */
  private poser: BonePoser;
  private poses = makePoses(STREET_CHARACTER.armsDown);
  /** cuánto manda la pose armada por código sobre el clip (0 a 1) */
  private procWeight = 1;
  private lastPose: Pose | null = null;
  private basePosition: THREE.Vector3;
  /** lo que mide el jugador, en las unidades de `object` */
  private height: number;

  constructor(private lib: CharacterLibrary, custom: PlayerCustom, team: TeamColors) {
    this.model = cloneSkinned(lib.template);
    const k = lib.scale * PLAYER_SCALE;
    this.model.scale.set(k * BUILD_SCALE[custom.build], k * HEIGHT_SCALE[custom.height], k * BUILD_SCALE[custom.build]);
    this.basePosition = this.model.position.clone();
    this.height = STREET_CHARACTER.heightM * PLAYER_SCALE * HEIGHT_SCALE[custom.height];
    this.object.add(this.model);
    this.poser = new BonePoser(this.model, STREET_CHARACTER.poseBones);
    this.paint(custom, team);
    this.attachNumber(custom.number, custom.shirtColor ?? team.primary);
    this.attachShoes(custom.shoeColor, team.primary);
    this.attachHair(custom, team);

    this.mixer = new THREE.AnimationMixer(this.model);
    // cada animación del juego toma el clip con su mismo nombre, o el que diga STREET_CHARACTER.clipNames
    const names = new Set([...lib.clips.keys(), ...Object.keys(STREET_CHARACTER.clipNames)]);
    for (const name of names) {
      const alias = (STREET_CHARACTER.clipNames[name] ?? []).map((n) => n.toLowerCase());
      const clip = lib.clips.get(name) ?? alias.map((a) => lib.clips.get(a)).find(Boolean);
      if (!clip) continue;
      const action = this.mixer.clipAction(clip);
      if (MANUAL.has(name) || name.startsWith('brake') || name.startsWith('turn')) {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      }
      this.actions.set(name, action);
    }
    this.play(this.resolve(['idle']) ?? '', 0);
  }

  /** Colores por material, peinado elegido, barba, contorno y luz de borde. */
  private paint(custom: PlayerCustom, team: TeamColors): void {
    const hairMeshes: THREE.Object3D[] = [];
    const meshes: THREE.Mesh[] = [];
    const hidden = new Set(STREET_CHARACTER.hideMeshes);
    this.model.traverse((o) => {
      const name = o.name.toLowerCase();
      if (hidden.has(o.name)) o.visible = false;
      if (name.startsWith('hair_')) hairMeshes.push(o);
      if (name === 'beard') o.visible = custom.beard;
      if ((o as THREE.Mesh).isMesh && o.visible) meshes.push(o as THREE.Mesh);
    });
    if (hairMeshes.length) for (const h of hairMeshes) h.visible = h.name.toLowerCase() === `hair_${custom.hairStyle}`;

    for (const mesh of meshes) {
      mesh.castShadow = true;
      const source = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      // cada jugador tiene sus propias copias de los materiales (las texturas se siguen compartiendo)
      const copies = source.map((mat) => {
        const copy = mat.clone();
        const name = mat.name.toLowerCase();
        // primero por nombre de material; si no, por nombre de malla (STREET_CHARACTER.meshSlots)
        const meshSlot = STREET_CHARACTER.meshSlots[mesh.name];
        const slot = SLOTS.find((sl) => sl.words.some((w) => name.includes(w))) ?? SLOTS.find((sl) => meshSlot && sl.words.includes(meshSlot));
        if (slot && 'color' in copy) {
          const color = (copy as THREE.MeshStandardMaterial).color;
          // con textura, el color se mezcla para no taparla del todo
          if ((copy as THREE.MeshStandardMaterial).map) color.set('#ffffff').lerp(new THREE.Color(slot.color(custom, team)), STREET_CHARACTER.tintStrength);
          else color.set(slot.color(custom, team));
        }
        addRim(copy, team.primary);
        // una sola textura con ropa gris: se pinta la remera y el short por altura del cuerpo
        const key = STREET_CHARACTER.colorKey;
        if (key && !slot && (copy as THREE.MeshStandardMaterial).map) {
          if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
          addColorKey(copy, key, mesh.geometry.boundingBox!, {
            jersey: custom.shirtColor ?? team.primary,
            shorts: team.secondary,
            skin: custom.skin,
            hair: custom.hairColor,
            socks: team.secondary,
            shoes: custom.shoeColor,
            sleeveless: custom.shirt === 'cortada',
            shortsLength: custom.shorts,
            socksType: custom.socks,
            buzz: custom.hairStyle === 'rapado' || custom.hairStyle === 'cresta',
            beard: custom.beard,
            faceZ: faceFrontZ(mesh.geometry, key),
          });
        }
        this.ownMaterials.push(copy);
        return copy;
      });
      mesh.material = Array.isArray(mesh.material) ? copies : copies[0];
      addOutline(mesh);
    }
  }

  /** El número de la espalda, pegado al hueso de la columna para que acompañe al cuerpo. */
  private attachNumber(n: number, jerseyColor: string): void {
    this.model.updateMatrixWorld(true);
    let bone: THREE.Object3D | null = null;
    this.model.traverse((o) => {
      if (!bone && (o as THREE.Bone).isBone && o.name.toLowerCase().includes(STREET_CHARACTER.numberBone)) bone = o;
    });
    if (!bone) return;
    const target = bone as THREE.Object3D;
    // la espalda: el punto más atrás de lo que se ve (sin armas ni capa ocultas), a la altura del hueso
    const box = new THREE.Box3();
    this.model.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && o.visible && !o.name.endsWith('__outline')) box.expandByObject(o);
    });
    const at = new THREE.Vector3().setFromMatrixPosition(target.matrixWorld);
    this.numberMap = numberTexture(n, readableOn(jerseyColor));
    // medidas en metros del mundo: se arma afuera del modelo escalado y después se pega al hueso
    const size = 0.3 * PLAYER_SCALE;
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: this.numberMap, transparent: true }));
    this.ownMaterials.push(plane.material);
    plane.position.set(at.x, at.y + size * 0.2, box.min.z - 0.01);
    plane.rotation.y = Math.PI;
    this.object.add(plane);
    this.object.updateMatrixWorld(true);
    target.attach(plane);
  }

  /** Zapatillas para un modelo descalzo: capellada del color elegido y suela clara, pegadas al hueso de cada pie. */
  private attachShoes(color: string, rimColor: string): void {
    const cfg = STREET_CHARACTER.shoes;
    if (!cfg) return;
    const bones = new Map<string, THREE.Object3D>();
    this.model.traverse((o) => {
      if ((o as THREE.Bone).isBone) bones.set(o.name, o);
    });
    this.object.updateMatrixWorld(true);
    const H = this.height;
    const upper = addRim(new THREE.MeshStandardMaterial({ color, roughness: 0.5 }), rimColor);
    const soleMat = new THREE.MeshStandardMaterial({ color: '#f1efe8', roughness: 0.8 });
    this.ownMaterials.push(upper, soleMat);
    const length = 0.15 * H;
    const width = 0.056 * H;
    const height = 0.058 * H;
    for (let i = 0; i < 2; i++) {
      const foot = bones.get(cfg.footBones[i]);
      const toe = bones.get(cfg.toeBones[i]);
      if (!foot || !toe) continue;
      const a = this.object.worldToLocal(foot.getWorldPosition(new THREE.Vector3()));
      const b = this.object.worldToLocal(toe.getWorldPosition(new THREE.Vector3()));
      const fwd = new THREE.Vector3(b.x - a.x, 0, b.z - a.z).normalize();
      // del talón (un poco detrás del tobillo) hacia la punta
      const heel = a.clone().addScaledVector(fwd, -0.04 * H);
      const shoe = new THREE.Group();
      shoe.position.set(heel.x + fwd.x * length * 0.5, 0, heel.z + fwd.z * length * 0.5);
      shoe.rotation.y = Math.atan2(fwd.x, fwd.z);
      const bodyGeo = new RoundedBoxGeometry(width, height * 0.8, length, 2, width * 0.35);
      const soleGeo = new THREE.BoxGeometry(width * 1.06, height * 0.24, length * 1.03);
      this.ownGeometries.push(bodyGeo, soleGeo);
      const body = new THREE.Mesh(bodyGeo, upper);
      body.position.y = height * 0.2 + height * 0.4;
      const sole = new THREE.Mesh(soleGeo, soleMat);
      sole.position.y = height * 0.12;
      body.castShadow = sole.castShadow = true;
      shoe.add(body, sole);
      addOutline(body);
      addOutline(sole);
      this.object.add(shoe);
      this.object.updateMatrixWorld(true);
      // pegada al pie: acompaña cada paso y cada patada
      foot.attach(shoe);
    }
  }

  /**
   * Peinados para un modelo que trae un solo pelo pintado: piezas 3D pegadas al
   * hueso de la cabeza. "corto" es el pelo del modelo; "rapado" lo deja al ras
   * (eso lo hace el shader). Si el modelo ya trae mallas hair_*, no se agrega nada.
   */
  private attachHair(custom: PlayerCustom, team: TeamColors): void {
    const cfg = STREET_CHARACTER.hair;
    const style = custom.hairStyle;
    if (!cfg || style === 'corto' || style === 'rapado') return;
    let hasOwn = false;
    const bones = new Map<string, THREE.Object3D>();
    this.model.traverse((o) => {
      if (o.name.toLowerCase().startsWith('hair_')) hasOwn = true;
      if ((o as THREE.Bone).isBone) bones.set(o.name, o);
    });
    const head = bones.get(cfg.headBone);
    const top = bones.get(cfg.headTopBone);
    if (hasOwn || !head || !top) return;
    this.object.updateMatrixWorld(true);
    const a = this.object.worldToLocal(head.getWorldPosition(new THREE.Vector3()));
    const b = this.object.worldToLocal(top.getWorldPosition(new THREE.Vector3()));
    // el cráneo: su centro queda a dos tercios entre la base y la punta, y el radio sale de lo que mide
    const c = a.clone().lerp(b, 0.66);
    const r = a.distanceTo(b) * STREET_CHARACTER.hairScale;
    const hairMat = addRim(new THREE.MeshStandardMaterial({ color: custom.hairColor, roughness: 0.95 }), team.primary);
    const mats: Record<string, THREE.MeshStandardMaterial> = { hair: hairMat };
    this.ownMaterials.push(hairMat);
    const material = (key: string, color: string) => {
      if (!mats[key]) {
        mats[key] = addRim(new THREE.MeshStandardMaterial({ color, roughness: 0.8 }), team.primary);
        this.ownMaterials.push(mats[key]);
      }
      return mats[key];
    };
    const group = new THREE.Group();
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, rx = 0) => {
      this.ownGeometries.push(geo);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(c.x + x * r, c.y + y * r, c.z + z * r);
      mesh.scale.set(sx, sy, sz);
      mesh.rotation.x = rx;
      mesh.castShadow = true;
      group.add(mesh);
      addOutline(mesh);
      return mesh;
    };
    // medidas en radios de cráneo: el cráneo es un poco más largo (adelante-atrás) que ancho.
    // Los aros (TorusGeometry) se acuestan girándolos en X, así que su largo adelante-atrás es la escala Y.
    if (style === 'afro') {
      add(new THREE.SphereGeometry(r * 1.25, 18, 14), hairMat, 0, 0.42, -0.5, 1.05, 0.95, 1);
    } else if (style === 'rodete') {
      add(new THREE.SphereGeometry(r * 0.42, 14, 10), hairMat, 0, 0.7, -1.1);
    } else if (style === 'cresta') {
      add(new RoundedBoxGeometry(r * 0.3, r * 0.5, r * 2, 2, r * 0.12), hairMat, 0, 0.95, -0.1);
    } else if (style === 'gorro') {
      const knit = material('gorro', team.primary);
      const band = material('gorroBand', team.secondary);
      add(new THREE.SphereGeometry(r * 1.08, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), knit, 0, 0.1, -0.05, 1, 1.05, 1.22);
      add(new THREE.TorusGeometry(r * 1.06, r * 0.15, 8, 24), band, 0, 0.12, -0.05, 1, 1.22, 1, Math.PI / 2);
      add(new THREE.SphereGeometry(r * 0.22, 10, 8), band, 0, 1.25, -0.05);
    } else if (style === 'cinta') {
      add(new THREE.TorusGeometry(r * 0.98, r * 0.1, 8, 24), material('cinta', team.secondary), 0, 0.28, -0.02, 1, 1.24, 1, Math.PI / 2 + 0.12);
    } else if (style === 'trenzas') {
      for (let k = 0; k < 5; k++) {
        const x = (k - 2) * 0.3;
        add(new THREE.CylinderGeometry(r * 0.11, r * 0.07, r * 1.3, 6), hairMat, x, -0.45, -1.28 + Math.abs(x) * 0.3, 1, 1, 1, 0.2);
      }
    }
    this.object.add(group);
    this.object.updateMatrixWorld(true);
    // pegado a la cabeza: acompaña cada movimiento
    head.attach(group);
  }

  /** El primer clip que exista de una lista de nombres (del más específico al más general). */
  private resolve(names: string[]): string | null {
    for (const n of names) if (this.actions.has(n)) return n;
    return null;
  }

  private play(name: string, fade = STREET_CHARACTER.crossFadeS): THREE.AnimationAction | null {
    const next = this.actions.get(name);
    if (!next) return null;
    if (this.current === next) return next;
    next.reset();
    next.enabled = true;
    next.setEffectiveWeight(1);
    next.play();
    if (this.current && fade > 0) this.current.crossFadeTo(next, fade, false);
    else if (this.current) this.current.stop();
    this.current = next;
    this.activeClip = name;
    return next;
  }

  update(dt: number, m: MotionState, time = 0, seed = 0): void {
    const c = STREET_CHARACTER;
    let name: string | null = null;
    // si el .glb no trae el clip, la pose se arma moviendo los huesos
    let pose: Pose | null = null;
    // la patada y la gambeta son cortas: su pose entra casi de golpe
    let quick = false;
    // lo más importante primero: tirado, patada, gambeta, festejo, saludo; si no, moverse
    if (this.actions.has('fall') ? m.down > 0.5 : m.down > 0.02) {
      name = this.resolve(['fall']);
      if (!name) pose = this.poses.fall(m.down);
    } else if (m.slide !== null) {
      name = this.resolve(['slide']);
      if (!name) {
        pose = this.poses.slide(m.slide);
        quick = true;
      }
    } else if (m.kick) {
      name = this.resolve(m.kick.kind === 'pass' ? ['pass', 'shot'] : ['shot', 'pass']);
      if (!name) {
        const { t, contact, follow } = m.kick;
        // el contacto cae en el 40% de la pose, igual que cuando el motor suelta la pelota
        const s = t < contact ? 0.4 * (t / contact) : 0.4 + 0.6 * Math.min(1, (t - contact) / follow);
        pose = this.poses.kick(m.kick.kind, s);
        quick = true;
      }
    } else if (m.trick !== null) {
      name = this.resolve(m.trickKind === 'cola' ? ['cola', 'turn'] : ['trick', 'turn']);
      if (!name) {
        pose = m.trickKind === 'cola' ? this.poses.cola(m.trick) : this.poses.trick(m.trick);
        quick = true;
      }
    } else if (m.celebrate) {
      name = this.resolve([`celebrate_${m.celebrate}`, 'celebrate']);
      if (!name) pose = this.poses.celebrate(m.celebrate, time + seed);
    } else if (m.greet) {
      name = this.resolve([`greet_${m.greet}`, 'greet']);
      if (!name) pose = this.poses.greet(m.greet, time + seed);
    } else if (m.brake) name = this.resolve(['brake']);
    else if (m.turn && m.speed > 1) name = this.resolve(['turn']);
    if (!name && !pose) {
      if (m.speed < c.idleBelow) name = this.resolve(['idle']);
      else if (m.speed > c.sprintAbove) name = this.resolve(['sprint', 'trot', 'idle']);
      else name = this.resolve(['trot', 'sprint', 'idle']);
      if (!name) pose = this.poses.idle(time, seed, m.sulk);
    }
    // mientras manda la pose, el clip que venía sigue corriendo por debajo para volver a él sin salto
    const action = name ? this.play(name) : null;
    if (pose) this.lastPose = pose;
    const rate = dt / (quick ? 0.06 : Math.max(0.01, c.crossFadeS));
    this.procWeight = pose ? Math.min(1, this.procWeight + rate) : Math.max(0, this.procWeight - rate);

    if (action && name) {
      const clip = action.getClip();
      if (name === 'trot' || name === 'sprint') {
        // la carrera va al ritmo de la velocidad real: los pies no patinan
        const ref = name === 'sprint' ? c.sprintSpeed : c.trotSpeed;
        action.timeScale = Math.max(0.5, Math.min(1.8, m.speed / ref));
      } else if ((name === 'pass' || name === 'shot') && m.kick) {
        // el cuadro de contacto del clip cae justo cuando el motor suelta la pelota
        const contactAt = clip.duration * c.kickContact[name];
        const { t, contact, follow } = m.kick;
        const time = t < contact ? (t / contact) * contactAt : contactAt + ((t - contact) / follow) * (clip.duration - contactAt);
        action.timeScale = 0;
        action.time = Math.min(clip.duration, Math.max(0, time));
      } else if (name === 'trick' && m.trick !== null) {
        action.timeScale = 0;
        action.time = m.trick * clip.duration;
      } else {
        action.timeScale = 1;
      }
    }
    // reposo → clip encima → pose encima (con su peso)
    this.poser.reset();
    this.mixer.update(dt);
    const w = this.lastPose ? this.procWeight : 0;
    if (w > 0 && this.lastPose) this.poser.blend(this.lastPose, w);
    const p = this.lastPose;
    // el cuerpo entero: subir/bajar, girar sobre sí mismo y tumbarse
    let spin = p ? p.spin % (Math.PI * 2) : 0;
    if (spin > Math.PI) spin -= Math.PI * 2;
    this.model.position.set(this.basePosition.x, this.basePosition.y + (p ? p.lift * this.height * w : 0), this.basePosition.z);
    this.model.rotation.set(p ? p.tilt * w : 0, spin * w, 0);
  }

  dispose(): void {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.model);
    // la geometría y las texturas son de la plantilla compartida: solo se liberan las copias propias
    for (const m of this.ownMaterials) m.dispose();
    for (const g of this.ownGeometries) g.dispose();
    this.numberMap?.dispose();
    void this.lib;
  }
}
