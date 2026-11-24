/**
 * La vista previa 3D de "Mi equipo": un podio con luz de escenario donde el
 * jugador que elegís respira, se puede girar con el mouse o el dedo, y hace su
 * celebración o su gesto de entrada cuando se lo pedís. En el resumen muestra
 * los tres jugadores en formación. Usa el mismo modelo que el partido
 * (playerModel.ts), así que lo que ves es lo que juega.
 */
import * as THREE from 'three';
import { readableOn } from '../../lib/countryVisuals';
import type { PlayerCustom, StreetTeam } from '../../lib/street/team';
import type { CharacterLibrary } from './characters/gltfCharacter';
import { createCharacter } from './characters/library';
import { restMotion, type StreetCharacter } from './characters/types';

export type PreviewMode = 'single' | 'team';
export type PreviewAction = 'celebrate' | 'entry';

/** cuánto dura la celebración o el gesto antes de volver a quedarse parado (segundos) */
const ACTION_SECONDS = 2.6;
/** cuántos radianes da de más al cambiar de jugador, antes de quedar de frente */
const SWITCH_SPIN = Math.PI * 1.6;
/** dónde se para cada jugador en el modo equipo: último hombre atrás, armador y extremo adelante */
const FORMATION: Array<[number, number]> = [
  [0, -0.95],
  [-1.05, 0.55],
  [1.05, 0.55],
];

/** Lo que de verdad cambia el aspecto del modelo; el apodo, las estadísticas y los gestos no lo cambian, así que no obligan a reconstruirlo. */
function modelKey(p: PlayerCustom, team: StreetTeam): string {
  const { nickname, stats, celebration, entry, ...look } = p;
  void nickname;
  void stats;
  void celebration;
  void entry;
  return JSON.stringify([look, team.primary, team.secondary]);
}

function floorTexture(label: string, color: string, size: 'big' | 'small'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 512, 512);
  // halo cálido de la luz, anillo pintado con el color del equipo y el número hecho con plantilla
  const halo = ctx.createRadialGradient(256, 256, 20, 256, 256, 256);
  halo.addColorStop(0, 'rgba(255,200,120,0.32)');
  halo.addColorStop(1, 'rgba(255,200,120,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, 512, 512);
  ctx.lineWidth = 14;
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(256, 256, 232, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(256, 256, 208, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = color;
  ctx.font = `${size === 'big' ? 230 : 150}px Anton, Impact, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // la plantilla de spray: letras con cortes
  ctx.fillText(label, 256, 262);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = '#000';
  for (const y of [236, 292]) ctx.fillRect(40, y, 432, 7);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class TeamPreviewScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);
  private stage = new THREE.Group();
  private rim = new THREE.DirectionalLight('#ffffff', 2.2);
  private floor: THREE.Mesh | null = null;
  /** cada jugador en el podio: su soporte (lugar y giro) y el personaje adentro */
  private rigs: Array<{ holder: THREE.Group; char: StreetCharacter; key: string; slot: number } | null> = [];
  private floorKey = '';
  private team: StreetTeam | null = null;
  private slot = 0;
  private yaw = 0;
  private spin = 0;
  private time = 0;
  private actionKind: PreviewAction | null = null;
  private actionLeft = 0;

  constructor(
    canvas: HTMLCanvasElement,
    private mode: PreviewMode,
    /** el modelo .glb, o null para el jugador armado por código */
    private library: CharacterLibrary | null = null
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    // luz de escenario: un foco cálido de arriba, otra luz de borde con el color del equipo, y relleno suave
    this.scene.add(new THREE.HemisphereLight('#ffe2c0', '#2a2d36', 1.05));
    const spot = new THREE.SpotLight('#ffd9a0', 120, 18, 0.55, 0.55, 1.2);
    spot.position.set(2.4, 6.5, 3.4);
    spot.castShadow = true;
    spot.shadow.mapSize.set(1024, 1024);
    spot.shadow.bias = -0.0005;
    this.scene.add(spot, spot.target);
    this.rim.position.set(-3, 3, -4);
    this.scene.add(this.rim);

    // el podio: un cilindro de cemento con borde
    const radius = mode === 'team' ? 2.3 : 1.25;
    const platform = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius + 0.08, 0.2, 56), new THREE.MeshLambertMaterial({ color: '#2c2f36' }));
    platform.position.y = 0.1;
    platform.receiveShadow = true;
    this.stage.add(platform);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(radius + 0.04, 0.025, 8, 56), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    lip.rotation.x = Math.PI / 2;
    lip.position.y = 0.2;
    (lip.material as THREE.MeshBasicMaterial).color.set('#efece2');
    this.stage.add(lip);
    // solo recibe la sombra: el resto es transparente y se ve el fondo del menú
    const ground = new THREE.Mesh(new THREE.CircleGeometry(14, 40), new THREE.ShadowMaterial({ opacity: 0.4 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.scene.add(this.stage);

    const far = mode === 'team' ? 9.2 : 7.1;
    this.camera.position.set(0, mode === 'team' ? 2.1 : 1.75, far);
    this.camera.lookAt(0, mode === 'team' ? 1.15 : 1.3, 0);
  }

  /** Muestra a este jugador (o a los tres, en modo equipo). Solo reconstruye lo que de verdad cambió. */
  setTeam(team: StreetTeam, slot: number): void {
    const changedSlot = slot !== this.slot;
    this.team = team;
    this.slot = slot;
    this.rim.color.set(team.primary);

    const slots = this.mode === 'team' ? [0, 1, 2] : [slot];
    slots.forEach((s, i) => {
      const key = modelKey(team.players[s], team);
      const current = this.rigs[i];
      if (current && current.key === key && current.slot === s) return;
      if (current) {
        this.stage.remove(current.holder);
        current.char.dispose();
      }
      const char = createCharacter(team.players[s], team, this.library);
      char.object.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true;
      });
      const holder = new THREE.Group();
      holder.add(char.object);
      const [x, z] = this.mode === 'team' ? FORMATION[s] : [0, 0];
      holder.position.set(x, 0.2, z);
      this.stage.add(holder);
      this.rigs[i] = { holder, char, key, slot: s };
    });

    const player = team.players[slot];
    const label = this.mode === 'team' ? team.abbr : String(player.number);
    const floorKey = `${this.mode}|${label}|${team.primary}`;
    if (floorKey !== this.floorKey) {
      this.floorKey = floorKey;
      if (this.floor) {
        this.stage.remove(this.floor);
        (this.floor.material as THREE.MeshBasicMaterial).map?.dispose();
        (this.floor.material as THREE.Material).dispose();
        this.floor.geometry.dispose();
      }
      const radius = this.mode === 'team' ? 2.3 : 1.25;
      this.floor = new THREE.Mesh(
        new THREE.PlaneGeometry(radius * 2, radius * 2),
        new THREE.MeshBasicMaterial({ map: floorTexture(label, team.primary, this.mode === 'team' ? 'small' : 'big'), transparent: true, depthWrite: false })
      );
      this.floor.rotation.x = -Math.PI / 2;
      this.floor.position.y = 0.205;
      this.stage.add(this.floor);
    }

    if (changedSlot && this.mode === 'single') {
      // al cambiar de jugador entra girando hasta quedar de frente
      this.yaw = 0;
      this.spin = SWITCH_SPIN;
    }
  }

  /** Hace que el jugador celebre o haga su gesto de entrada. */
  play(kind: PreviewAction): void {
    this.actionKind = kind;
    this.actionLeft = ACTION_SECONDS;
  }

  /** Gira la vista (lo llama el arrastre del mouse o del dedo). */
  rotateBy(radians: number): void {
    this.yaw += radians;
  }

  resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    // si la vista es angosta (celular), la cámara se aleja para que entre todo
    const base = this.mode === 'team' ? 9.2 : 7.1;
    const narrow = Math.max(1, 0.95 / this.camera.aspect);
    this.camera.position.z = base * narrow;
    this.camera.updateProjectionMatrix();
  }

  render(dtMs: number): void {
    const dt = Math.min(0.05, dtMs / 1000);
    this.time += dt;
    this.spin *= Math.exp(-3.2 * dt);
    this.actionLeft = Math.max(0, this.actionLeft - dt);
    this.stage.rotation.y = this.mode === 'team' ? this.yaw : 0;

    this.rigs.forEach((entry, i) => {
      if (!entry || !this.team) return;
      const custom = this.team.players[entry.slot];
      // parado, o haciendo la celebración / el gesto de entrada que se pidió
      const motion = restMotion();
      if (this.actionLeft > 0 && this.actionKind === 'celebrate') motion.celebrate = custom.celebration;
      if (this.actionLeft > 0 && this.actionKind === 'entry') motion.greet = custom.entry;
      entry.holder.rotation.y = this.mode === 'team' ? 0 : this.yaw + this.spin;
      entry.char.update(dt, motion, this.time, i * 2 + 1);
    });
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    for (const entry of this.rigs) if (entry) entry.char.dispose();
    if (this.floor) {
      (this.floor.material as THREE.MeshBasicMaterial).map?.dispose();
      this.floor.geometry.dispose();
    }
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || this.rigs.some((r) => r && r.holder.getObjectById(o.id))) return;
      mesh.geometry?.dispose();
      const m = mesh.material as THREE.Material | undefined;
      if (m && m.side !== THREE.BackSide) m.dispose();
    });
    this.renderer.dispose();
  }
}

/** El color de texto legible sobre el color del equipo (para los menús). */
export const inkOn = (color: string): string => readableOn(color);
