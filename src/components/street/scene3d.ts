/**
 * The 3D view of Fútbol callejero. The match itself still runs in the 2D
 * engine (src/lib/street/engine.ts); this file only draws that state: a caged
 * street court at sunset, six procedural players animated by code, the ball,
 * and a TV-style camera that follows the play.
 */
import * as THREE from 'three';
import { BALL_R, COURT, PLAYER_R } from '../../lib/street/engine';
import type { StreetPlayer, StreetState } from '../../lib/street/engine';
import { STREET } from '../../config/gameConfig';

export interface TeamLook3d {
  primary: string;
  secondary: string;
}

/** metres per engine pixel: the 800x480 court becomes 30x18 m */
const K = 30 / COURT.w;
const HALF_W = (COURT.w * K) / 2;
const HALF_D = (COURT.h * K) / 2;
const GOAL_HALF = ((COURT.goalBottom - COURT.goalTop) * K) / 2;
const GOAL_HEIGHT = 2;
const GOAL_DEPTH = 1.3;
const BALL_RADIUS = BALL_R * K * 0.62;
/** players are drawn a little larger than life so they read well from the TV camera */
const PLAYER_SCALE = 1.22;
const toX = (x: number) => (x - COURT.w / 2) * K;
/** positions are packed as [x0, y0, x1, y1, ...]: the six players, then the ball (engine pixels) */
export const POSITION_SLOTS = 14;
/** how fast a network correction fades out (seconds) */
const CORRECTION_FADE_S = 0.12;
/** a jump bigger than this (a kickoff, say) is shown as is, not smoothed */
const CORRECTION_MAX_PX = 140;

/** Where every player and the ball are, in the layout `POSITION_SLOTS` describes. */
export function readPositions(s: StreetState, out: Float32Array<ArrayBuffer> = new Float32Array(POSITION_SLOTS)): Float32Array<ArrayBuffer> {
  s.players.forEach((p, i) => {
    out[i * 2] = p.x;
    out[i * 2 + 1] = p.y;
  });
  out[12] = s.ball.x;
  out[13] = s.ball.y;
  return out;
}
const toZ = (y: number) => (y - COURT.h / 2) * K;

function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** deterministic 0-1 numbers, so the court and the players look the same every match */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// ---------------------------------------------------------------- court

function courtTexture(): THREE.CanvasTexture {
  const S = 2; // texture pixels per engine pixel
  return canvasTexture(COURT.w * S, COURT.h * S, (ctx) => {
    const w = COURT.w * S;
    const h = COURT.h * S;
    const rand = seeded(5);
    ctx.fillStyle = '#5a5d66';
    ctx.fillRect(0, 0, w, h);
    // worn asphalt: speckles, darker patches, a few cracks
    for (let i = 0; i < 9000; i++) {
      ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)';
      ctx.fillRect(rand() * w, rand() * h, 2 + rand() * 3, 2 + rand() * 3);
    }
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = `rgba(0,0,0,${0.05 + rand() * 0.07})`;
      ctx.beginPath();
      ctx.ellipse(rand() * w, rand() * h, 60 + rand() * 160, 40 + rand() * 90, rand() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(20,20,24,0.5)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      let x = rand() * w;
      let y = rand() * h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 0; k < 6; k++) {
        x += (rand() - 0.5) * 120;
        y += (rand() - 0.5) * 120;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // street art, faded into the floor
    const tag = (text: string, x: number, y: number, angle: number, color: string, size: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.font = `900 italic ${size}px Impact, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.globalAlpha = 0.26;
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#15151a';
      ctx.strokeText(text, 0, 0);
      ctx.fillStyle = color;
      ctx.fillText(text, 0, 0);
      ctx.restore();
    };
    tag('POTRERO', w * 0.26, h * 0.3, -0.12, '#ff5d8f', 150);
    tag('PICHANGA', w * 0.74, h * 0.78, 0.1, '#3ddc97', 140);
    tag('EL BARRIO', w * 0.72, h * 0.26, 0.06, '#ffd23f', 96);
    tag('JOGA', w * 0.24, h * 0.8, -0.08, '#4cc9f0', 120);

    // painted lines, a bit chipped
    ctx.strokeStyle = 'rgba(245,245,240,0.92)';
    ctx.lineWidth = 7;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.beginPath();
    ctx.moveTo(w / 2, 8);
    ctx.lineTo(w / 2, h - 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 54 * S, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(245,245,240,0.92)';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 7, 0, Math.PI * 2);
    ctx.fill();
    const boxTop = (COURT.goalTop - 40) * S;
    const boxH = (COURT.goalBottom - COURT.goalTop + 80) * S;
    ctx.strokeRect(8, boxTop, 96 * S, boxH);
    ctx.strokeRect(w - 8 - 96 * S, boxTop, 96 * S, boxH);
    ctx.beginPath();
    ctx.arc(8 + 96 * S, h / 2, 36 * S, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w - 8 - 96 * S, h / 2, 36 * S, Math.PI / 2, -Math.PI / 2);
    ctx.stroke();
    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = 'rgba(90,93,102,0.55)';
      ctx.fillRect(rand() * w, rand() * h, 3 + rand() * 5, 2 + rand() * 3);
    }
  });
}

function meshTexture(cell: number, color: string, repeatX: number, repeatY: number): THREE.CanvasTexture {
  const t = canvasTexture(64, 64, (ctx) => {
    ctx.clearRect(0, 0, 64, 64);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    for (let d = -64; d <= 128; d += cell) {
      ctx.beginPath();
      ctx.moveTo(d, 0);
      ctx.lineTo(d + 64, 64);
      ctx.moveTo(d + 64, 0);
      ctx.lineTo(d, 64);
      ctx.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  return t;
}

function skyTexture(): THREE.CanvasTexture {
  return canvasTexture(16, 512, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, '#1d1b45');
    g.addColorStop(0.38, '#5b3a78');
    g.addColorStop(0.62, '#d9625a');
    g.addColorStop(0.8, '#ffab5e');
    g.addColorStop(1, '#ffd98a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 16, 512);
  });
}

function windowsTexture(seed: number, wall: string): THREE.CanvasTexture {
  return canvasTexture(128, 256, (ctx) => {
    const rand = seeded(seed);
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, 128, 256);
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 4; col++) {
        const lit = rand() > 0.45;
        ctx.fillStyle = lit ? (rand() > 0.5 ? '#ffd27a' : '#ffb35c') : '#1c1a2b';
        ctx.fillRect(12 + col * 29, 12 + row * 27, 18, 16);
      }
    }
  });
}

function blobTexture(): THREE.CanvasTexture {
  return canvasTexture(64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 4, 32, 32, 32);
    g.addColorStop(0, 'rgba(0,0,0,0.6)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  });
}

function ballTexture(): THREE.CanvasTexture {
  return canvasTexture(128, 64, (ctx) => {
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, 128, 64);
    ctx.fillStyle = '#1c1d22';
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 6; col++) {
        ctx.beginPath();
        ctx.arc(col * 22 + (row % 2) * 11 + 8, row * 22 + 10, 6.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}

function numberTexture(n: number, color: string): THREE.CanvasTexture {
  return canvasTexture(64, 64, (ctx) => {
    ctx.clearRect(0, 0, 64, 64);
    ctx.font = '900 50px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.strokeText(String(n), 32, 35);
    ctx.fillStyle = color;
    ctx.fillText(String(n), 32, 35);
  });
}

// ---------------------------------------------------------------- players

const SKINS = ['#f1c7a3', '#e0ab82', '#c48d63', '#9c6b46', '#6f4a31'];
const HAIRS = ['#16110e', '#33210f', '#5c3b1e', '#b08a3c', '#2a2a2e'];
const BOOTS = ['#f2f2f2', '#17181c', '#ff5a36', '#35d0ff', '#e8ff3a', '#17181c'];
const SHIRT_NUMBERS = [4, 10, 7, 5, 9, 11];

/** A jointed human figure of about 1.8 m: hips, knees, shoulders and elbows
 * are groups that the animation code rotates. */
interface PlayerRig {
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

function buildPlayer(index: number, look: TeamLook3d): PlayerRig {
  const rand = seeded(31 + index * 17);
  const skin = new THREE.MeshLambertMaterial({ color: SKINS[Math.floor(rand() * SKINS.length)] });
  const hair = new THREE.MeshLambertMaterial({ color: HAIRS[Math.floor(rand() * HAIRS.length)] });
  const jersey = new THREE.MeshLambertMaterial({ color: look.primary });
  const trim = new THREE.MeshLambertMaterial({ color: look.secondary });
  const shortsMat = new THREE.MeshLambertMaterial({ color: '#1d1f26' });
  const boot = new THREE.MeshLambertMaterial({ color: BOOTS[index] });
  const height = 0.95 + rand() * 0.1;
  const build = 0.93 + rand() * 0.18;
  const hairStyle = Math.floor(rand() * 4);

  const root = new THREE.Group();
  const body = new THREE.Group();
  body.scale.set(build * PLAYER_SCALE, height * PLAYER_SCALE, build * PLAYER_SCALE);
  root.add(body);

  /** a capsule hanging down from its parent's origin */
  const part = (parent: THREE.Object3D, radius: number, length: number, mat: THREE.Material, y = 0) => {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 4, 10), mat);
    m.position.y = y - length / 2;
    m.castShadow = true;
    parent.add(m);
    return m;
  };

  const makeLeg = (side: number) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.1, 0.94, 0);
    part(hip, 0.078, 0.34, skin, -0.04);
    part(hip, 0.092, 0.16, shortsMat, 0.02); // the leg of the shorts
    const knee = new THREE.Group();
    knee.position.y = -0.45;
    hip.add(knee);
    part(knee, 0.058, 0.3, skin, -0.02);
    part(knee, 0.062, 0.2, trim, -0.14); // sock
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.085, 0.27), boot);
    shoe.position.set(0, -0.445, 0.065);
    shoe.castShadow = true;
    knee.add(shoe);
    body.add(hip);
    return { hip, knee };
  };
  const left = makeLeg(-1);
  const right = makeLeg(1);

  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.2, 0.21), shortsMat);
  pelvis.position.y = 0.97;
  pelvis.castShadow = true;
  body.add(pelvis);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.165, 0.32, 5, 12), jersey);
  torso.position.y = 1.27;
  torso.scale.set(1.14, 1, 0.74);
  torso.castShadow = true;
  body.add(torso);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.39, 0.035, 0.26), trim);
  stripe.position.y = 1.09;
  body.add(stripe);

  const numberMat = new THREE.MeshBasicMaterial({ map: numberTexture(SHIRT_NUMBERS[index], look.secondary), transparent: true });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.24), numberMat);
  back.position.set(0, 1.3, -0.128);
  back.rotation.y = Math.PI;
  body.add(back);

  const makeArm = (side: number) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.235, 1.47, 0);
    part(shoulder, 0.05, 0.2, skin, -0.04);
    part(shoulder, 0.062, 0.1, jersey, 0.02); // short sleeve
    const elbow = new THREE.Group();
    elbow.position.y = -0.29;
    shoulder.add(elbow);
    part(elbow, 0.041, 0.2, skin, -0.02);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.046, 8, 6), skin);
    hand.position.y = -0.29;
    hand.castShadow = true;
    elbow.add(hand);
    body.add(shoulder);
    return { shoulder, elbow };
  };
  const armLeft = makeArm(-1);
  const armRight = makeArm(1);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.055, 0.1, 10), skin);
  neck.position.y = 1.57;
  body.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.112, 18, 14), skin);
  head.position.y = 1.7;
  head.scale.set(0.95, 1.16, 1.02);
  head.castShadow = true;
  body.add(head);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 5), skin);
  nose.position.set(0, 1.69, 0.115);
  body.add(nose);

  // hair: short crop, longer on top, tied back, or shaved
  if (hairStyle < 3) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.118, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.56), hair);
    cap.position.set(0, 1.715, -0.012);
    cap.scale.set(0.97, hairStyle === 1 ? 1.3 : 1.16, 1.05);
    cap.castShadow = true;
    body.add(cap);
    if (hairStyle === 2) {
      const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.12, 3, 8), hair);
      tail.position.set(0, 1.7, -0.14);
      tail.rotation.x = 0.7;
      body.add(tail);
    }
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
    phase: rand() * 6,
    angle: 0,
    kickT: 0,
    prevPickupCd: 0,
    down: 0,
  };
}

// ---------------------------------------------------------------- scene

export class StreetScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 200);
  private rigs: PlayerRig[] = [];
  private ball: THREE.Mesh;
  private ballShadow: THREE.Mesh;
  private ballHeight = 0;
  private ballVy = 0;
  private ballWasFree = false;
  private marker: THREE.Group;
  private crowd: THREE.InstancedMesh;
  private crowdBase: THREE.Vector3[] = [];
  private focus = new THREE.Vector3();
  private zoom = 1;
  private shake = 0;
  private time = 0;
  private prevPhase: StreetState['phase'] = 'playing';
  private seenPopups = new Set<number>();
  private popupNodes = new Map<number, HTMLDivElement>();
  private disposables: Array<{ dispose: () => void }> = [];
  private dummy = new THREE.Object3D();
  /** what gets drawn this frame: the state between the last two ticks, plus any correction still fading */
  private shown = new Float32Array(POSITION_SLOTS);
  private offset = new Float32Array(POSITION_SLOTS);
  private pixelRatio = Math.min(window.devicePixelRatio, 1.75);
  private slowFrames = 0;
  private size = { w: 0, h: 0 };

  constructor(
    canvas: HTMLCanvasElement,
    private overlay: HTMLDivElement,
    private looks: readonly [TeamLook3d, TeamLook3d],
    /** whose marker and camera this screen shows: 0, or 1 for the guest of an online match */
    private viewTeam: 0 | 1 = 0
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const sky = skyTexture();
    this.scene.background = sky;
    this.scene.fog = new THREE.Fog('#d98a6a', 38, 110);
    this.disposables.push(sky);

    // warm low sun (the only light that casts shadows) + soft fill
    this.scene.add(new THREE.HemisphereLight('#ffd9b5', '#4a3a55', 1.55));
    const sun = new THREE.DirectionalLight('#ffb070', 2.1);
    sun.position.set(-18, 14, -10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -19;
    sun.shadow.camera.right = 19;
    sun.shadow.camera.top = 13;
    sun.shadow.camera.bottom = -13;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 60;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.02;
    this.scene.add(sun);
    const rim = new THREE.DirectionalLight('#7f8cff', 0.5);
    rim.position.set(14, 8, 16);
    this.scene.add(rim);

    this.buildCourt();
    this.buildSurroundings();
    this.crowd = this.buildCrowd();

    const blob = blobTexture();
    this.disposables.push(blob);
    for (let i = 0; i < 6; i++) {
      const rig = buildPlayer(i, looks[i < 3 ? 0 : 1]);
      this.rigs.push(rig);
      this.scene.add(rig.root);
    }

    const ballMap = ballTexture();
    this.disposables.push(ballMap);
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(BALL_RADIUS, 18, 14), new THREE.MeshLambertMaterial({ map: ballMap }));
    this.ball.castShadow = true;
    this.scene.add(this.ball);
    this.ballShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.8),
      new THREE.MeshBasicMaterial({ map: blob, transparent: true, depthWrite: false })
    );
    this.ballShadow.rotation.x = -Math.PI / 2;
    this.ballShadow.position.y = 0.025;
    this.scene.add(this.ballShadow);

    // marker for the player the human controls: ring on the floor + arrow above
    this.marker = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.46, 0.56, 32),
      new THREE.MeshBasicMaterial({ color: '#ffe14a', side: THREE.DoubleSide, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.04;
    this.marker.add(ring);
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.26, 4), new THREE.MeshBasicMaterial({ color: '#ffe14a' }));
    arrow.rotation.x = Math.PI;
    arrow.position.y = 2.6;
    arrow.name = 'arrow';
    this.marker.add(arrow);
    this.scene.add(this.marker);

    this.camera.position.set(0, 12, 17);
    this.camera.lookAt(0, 0.8, 0);
  }

  private buildCourt() {
    const map = courtTexture();
    this.disposables.push(map);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(HALF_W * 2, HALF_D * 2), new THREE.MeshLambertMaterial({ map }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const street = new THREE.Mesh(new THREE.PlaneGeometry(160, 120), new THREE.MeshLambertMaterial({ color: '#3b3740' }));
    street.rotation.x = -Math.PI / 2;
    street.position.y = -0.03;
    this.scene.add(street);

    const wallMat = new THREE.MeshLambertMaterial({ color: '#8c8f9a' });
    const paintMat = new THREE.MeshLambertMaterial({ color: '#e0563f' });
    const postMat = new THREE.MeshLambertMaterial({ color: '#2d2f38' });
    const box = (w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      this.scene.add(m);
      return m;
    };

    // low concrete wall all the way round; the camera side stays low so it never hides the play
    const WALL = 0.9;
    const T = 0.3;
    box(HALF_W * 2 + T * 2, WALL, T, 0, WALL / 2, -HALF_D - T / 2, wallMat);
    box(HALF_W * 2 + T * 2, 0.12, T, 0, WALL + 0.06, -HALF_D - T / 2, paintMat);
    box(HALF_W * 2 + T * 2, 0.35, T, 0, 0.175, HALF_D + T / 2, wallMat);
    const endLen = HALF_D - GOAL_HALF;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const z = sz * (GOAL_HALF + endLen / 2);
        box(T, WALL, endLen, sx * (HALF_W + T / 2), WALL / 2, z, wallMat);
        box(T, 0.12, endLen, sx * (HALF_W + T / 2), WALL + 0.06, z, paintMat);
      }
    }

    // chain-link cage above the wall (far side and both ends)
    const FENCE = 3.4;
    const fence = (len: number, x: number, z: number, rotY: number) => {
      const tex = meshTexture(16, 'rgba(210,215,225,0.75)', len * 1.6, FENCE * 1.6);
      this.disposables.push(tex);
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(len, FENCE),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false })
      );
      m.position.set(x, WALL + FENCE / 2, z);
      m.rotation.y = rotY;
      this.scene.add(m);
    };
    fence(HALF_W * 2, 0, -HALF_D - T / 2, 0);
    fence(HALF_D * 2, -HALF_W - T / 2, 0, Math.PI / 2);
    fence(HALF_D * 2, HALF_W + T / 2, 0, Math.PI / 2);

    const postGeo = new THREE.CylinderGeometry(0.07, 0.07, WALL + FENCE, 8);
    const postSpots: Array<[number, number]> = [];
    for (let x = -HALF_W; x <= HALF_W + 0.01; x += 5) postSpots.push([x, -HALF_D - T / 2]);
    for (const sx of [-1, 1]) for (const z of [-HALF_D + 4.5, 0, HALF_D - 4.5, HALF_D]) postSpots.push([sx * (HALF_W + T / 2), z]);
    const posts = new THREE.InstancedMesh(postGeo, postMat, postSpots.length);
    postSpots.forEach(([x, z], i) => {
      this.dummy.position.set(x, (WALL + FENCE) / 2, z);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.updateMatrix();
      posts.setMatrixAt(i, this.dummy.matrix);
    });
    this.scene.add(posts);
    box(HALF_W * 2 + T * 2, 0.1, 0.1, 0, WALL + FENCE, -HALF_D - T / 2, postMat);

    // small futsal goals
    const frameMat = new THREE.MeshLambertMaterial({ color: '#f5f5f5' });
    const netTex = meshTexture(21, 'rgba(255,255,255,0.8)', 3, 3);
    this.disposables.push(netTex);
    const netMat = new THREE.MeshBasicMaterial({ map: netTex, transparent: true, side: THREE.DoubleSide, depthWrite: false });
    for (const sx of [-1, 1]) {
      const gx = sx * HALF_W;
      const bar = (len: number, x: number, y: number, z: number, axis: 'x' | 'y' | 'z') => {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, len, 10), frameMat);
        if (axis === 'x') m.rotation.z = Math.PI / 2;
        if (axis === 'z') m.rotation.x = Math.PI / 2;
        m.position.set(x, y, z);
        this.scene.add(m);
      };
      for (const sz of [-1, 1]) {
        bar(GOAL_HEIGHT, gx, GOAL_HEIGHT / 2, sz * GOAL_HALF, 'y');
        bar(GOAL_DEPTH, gx + (sx * GOAL_DEPTH) / 2, GOAL_HEIGHT, sz * GOAL_HALF, 'x');
        bar(GOAL_HEIGHT, gx + sx * GOAL_DEPTH, GOAL_HEIGHT / 2, sz * GOAL_HALF, 'y');
        const side = new THREE.Mesh(new THREE.PlaneGeometry(GOAL_DEPTH, GOAL_HEIGHT), netMat);
        side.position.set(gx + (sx * GOAL_DEPTH) / 2, GOAL_HEIGHT / 2, sz * GOAL_HALF);
        this.scene.add(side);
      }
      bar(GOAL_HALF * 2, gx, GOAL_HEIGHT, 0, 'z');
      bar(GOAL_HALF * 2, gx + sx * GOAL_DEPTH, GOAL_HEIGHT, 0, 'z');
      const backNet = new THREE.Mesh(new THREE.PlaneGeometry(GOAL_HALF * 2, GOAL_HEIGHT), netMat);
      backNet.rotation.y = Math.PI / 2;
      backNet.position.set(gx + sx * GOAL_DEPTH, GOAL_HEIGHT / 2, 0);
      this.scene.add(backNet);
      const roof = new THREE.Mesh(new THREE.PlaneGeometry(GOAL_DEPTH, GOAL_HALF * 2), netMat);
      roof.rotation.x = -Math.PI / 2;
      roof.position.set(gx + (sx * GOAL_DEPTH) / 2, GOAL_HEIGHT, 0);
      this.scene.add(roof);
    }
  }

  private buildSurroundings() {
    const rand = seeded(77);
    const walls = ['#5a4654', '#6b4a45', '#4a4a63', '#70534a'];
    const mats = walls.map((wall, i) => {
      const tex = windowsTexture(10 + i * 7, wall);
      this.disposables.push(tex);
      return new THREE.MeshLambertMaterial({ map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: 0.55 });
    });
    const roofMat = new THREE.MeshLambertMaterial({ color: '#2f2a36' });
    const building = (x: number, z: number, w: number, d: number, h: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats[Math.floor(rand() * mats.length)]);
      m.position.set(x, h / 2, z);
      this.scene.add(m);
      const top = new THREE.Mesh(new THREE.BoxGeometry(w * 0.4, 1.2, d * 0.4), roofMat);
      top.position.set(x + (rand() - 0.5) * w * 0.4, h + 0.6, z);
      this.scene.add(top);
    };
    // a block of flats behind the far fence and at both ends; nothing on the camera side
    for (let x = -42; x < 42; ) {
      const w = 7 + rand() * 7;
      building(x + w / 2, -21 - rand() * 5, w, 9, 9 + rand() * 13);
      x += w + 0.6;
    }
    for (const sx of [-1, 1]) {
      for (let z = -12; z < 22; ) {
        const d = 7 + rand() * 6;
        building(sx * (29 + rand() * 4), z + d / 2, 9, d, 8 + rand() * 11);
        z += d + 0.8;
      }
    }

    // street lamps: the glow is a sprite, not a real light
    const glowTex = canvasTexture(64, 64, (ctx) => {
      const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,236,170,1)');
      g.addColorStop(0.3, 'rgba(255,200,110,0.45)');
      g.addColorStop(1, 'rgba(255,190,90,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 64);
    });
    this.disposables.push(glowTex);
    const poleMat = new THREE.MeshLambertMaterial({ color: '#23242b' });
    const glowMat = new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    for (const [x, z] of [[-11, -11.2], [0, -11.2], [11, -11.2], [-17.2, 6], [17.2, 6]] as Array<[number, number]>) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 7, 8), poleMat);
      pole.position.set(x, 3.5, z);
      this.scene.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffe9a8' }));
      lamp.position.set(x, 7.1, z);
      this.scene.add(lamp);
      const glow = new THREE.Sprite(glowMat);
      glow.scale.set(5, 5, 1);
      glow.position.set(x, 7.1, z);
      this.scene.add(glow);
    }
  }

  /** Silhouetted fans pressed against the fence, as one instanced mesh. */
  private buildCrowd(): THREE.InstancedMesh {
    const rand = seeded(123);
    const spots: THREE.Vector3[] = [];
    for (let row = 0; row < 2; row++) {
      for (let x = -HALF_W + 0.6; x < HALF_W; x += 0.95) {
        spots.push(new THREE.Vector3(x + (rand() - 0.5) * 0.4, row * 0.5, -HALF_D - 1.1 - row * 0.9));
      }
    }
    for (const sx of [-1, 1]) {
      for (let z = -HALF_D + 0.5; z < HALF_D - 2; z += 1.05) {
        if (Math.abs(z) < GOAL_HALF + 0.8) continue;
        spots.push(new THREE.Vector3(sx * (HALF_W + 1.2 + rand() * 0.5), 0, z));
      }
    }
    const mesh = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.3, 0.95, 3, 8), new THREE.MeshLambertMaterial(), spots.length);
    const tones = ['#4a3550', '#5a3f4a', '#3d3a5c', '#6a4a44', '#4a4470', '#70504a'];
    const color = new THREE.Color();
    spots.forEach((p, i) => {
      mesh.setColorAt(i, color.set(tones[Math.floor(rand() * tones.length)]));
      this.crowdBase.push(p);
    });
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(mesh);
    return mesh;
  }

  resize(width: number, height: number) {
    this.size = { w: width, h: height };
    if (width <= 0 || height <= 0) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  /** A jolt for the camera: caños, hard shots, goals. */
  addShake(amount: number) {
    this.shake = Math.min(1, this.shake + amount);
  }

  /** The online guest's state was just pulled back in line with the host's.
   * Instead of jumping, everything glides from where it was drawn to where it should be. */
  addCorrection(before: Float32Array, after: Float32Array) {
    for (let k = 0; k < POSITION_SLOTS; k += 2) {
      const dx = before[k] - after[k];
      const dy = before[k + 1] - after[k + 1];
      if (Math.hypot(dx, dy) > CORRECTION_MAX_PX) {
        this.offset[k] = 0;
        this.offset[k + 1] = 0;
      } else {
        this.offset[k] += dx;
        this.offset[k + 1] += dy;
      }
    }
  }

  /** Lowers the resolution a step at a time while the frame rate stays low. */
  private adaptQuality(dtMs: number) {
    this.slowFrames = dtMs > 24 ? this.slowFrames + 1 : Math.max(0, this.slowFrames - 2);
    if (this.slowFrames < 90 || this.pixelRatio <= 0.75) return;
    this.slowFrames = 0;
    this.pixelRatio = Math.max(0.75, this.pixelRatio - 0.25);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.resize(this.size.w, this.size.h);
  }

  /** `prev` is where things were one tick earlier and `alpha` (0-1) how far the
   * clock has got towards the next tick: drawing in between keeps motion even
   * on any screen, whatever its refresh rate. */
  render(s: StreetState, dtMs: number, prev?: Float32Array, alpha = 1) {
    readPositions(s, this.shown);
    const fade = Math.exp(-dtMs / 1000 / CORRECTION_FADE_S);
    for (let k = 0; k < POSITION_SLOTS; k++) {
      const now = this.shown[k];
      const interpolated = prev ? prev[k] + (now - prev[k]) * alpha : now;
      this.offset[k] *= fade;
      this.shown[k] = interpolated + this.offset[k];
    }
    this.adaptQuality(dtMs);
    const dt = Math.min(0.05, dtMs / 1000);
    this.time += dt;
    const goalJustScored = s.phase === 'goal' && this.prevPhase !== 'goal';
    if (goalJustScored) this.addShake(0.7);
    this.prevPhase = s.phase;

    s.players.forEach((p, i) => this.animatePlayer(s, p, i, dt));
    this.animateBall(s, dt);
    this.animateCrowd(s);
    this.updateMarker(s);
    this.updateCamera(s, dt);
    this.renderer.render(this.scene, this.camera);
    this.updatePopups(s);
  }

  private animatePlayer(s: StreetState, p: StreetPlayer, i: number, dt: number) {
    const rig = this.rigs[i];
    rig.root.position.set(toX(this.shown[i * 2]), 0, toZ(this.shown[i * 2 + 1]));

    // turn towards where the player is facing, the short way round
    const target = Math.atan2(p.fx, p.fy);
    let diff = target - rig.angle;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    rig.angle += diff * Math.min(1, 12 * dt);

    const speed = Math.hypot(p.vx, p.vy) * K;
    const effort = Math.min(1, speed / 4.5);
    rig.phase += speed * dt * 2.1 + dt * 0.9;
    const stride = Math.sin(rig.phase);

    // a kick shows as the engine's short "can't pick the ball up" window starting
    if (p.pickupCd > rig.prevPickupCd + 100 && p.tackleLockMs <= 0) rig.kickT = 1;
    rig.prevPickupCd = p.pickupCd;
    rig.kickT = Math.max(0, rig.kickT - dt * 3.2);
    const kick = Math.sin(rig.kickT * Math.PI);

    const celebrating = s.phase === 'goal' && s.lastScorer === p.team;
    const sulking = s.phase === 'goal' && s.lastScorer !== p.team;
    rig.down += ((p.stunMs > 0 ? 1 : 0) - rig.down) * Math.min(1, 10 * dt);

    // running: hips swing opposite each other, the trailing knee folds up, arms pump with bent elbows.
    // Standing: weight on both feet, arms loose, a slow breath.
    const breath = Math.sin(this.time * 1.8 + i) * 0.02 * (1 - effort);
    let hipL = stride * 0.85 * effort;
    let hipR = -stride * 0.85 * effort;
    let kneeL = (0.18 + Math.max(0, Math.sin(rig.phase - 1.9)) * 1.35) * effort + 0.05;
    let kneeR = (0.18 + Math.max(0, Math.sin(rig.phase - 1.9 + Math.PI)) * 1.35) * effort + 0.05;
    let shoulderL = -stride * 0.8 * effort;
    let shoulderR = stride * 0.8 * effort;
    let elbowL = -(0.22 + effort * 1.15);
    let elbowR = -(0.22 + effort * 1.15);
    let spreadL = -0.09 - breath;
    let spreadR = 0.09 + breath;
    let lean = effort * 0.22;
    let lift = Math.abs(Math.cos(rig.phase)) * 0.045 * effort + breath * 0.4;
    let spin = 0;

    if (kick > 0) {
      // plant the left foot, swing the right leg through, opposite arm out for balance
      hipR = hipR * (1 - kick) - kick * 1.35;
      kneeR = kneeR * (1 - kick) + (rig.kickT > 0.5 ? 0.9 : 0.1) * kick;
      hipL = hipL * (1 - kick) + kick * 0.25;
      shoulderL -= kick * 0.9;
      spreadL -= kick * 0.5;
      lean -= kick * 0.16;
    }
    if (p.trickMs > 0) {
      // gambeta: a quick turn over the ball with the arms out
      const t = 1 - p.trickMs / STREET.trickMs;
      spin = t * Math.PI * 2;
      lift += Math.sin(t * Math.PI) * 0.14;
      spreadL = -1.0;
      spreadR = 1.0;
      elbowL = elbowR = -0.4;
    }
    if (celebrating) {
      lift = Math.abs(Math.sin(this.time * 7 + i)) * 0.4;
      spreadL = -2.75;
      spreadR = 2.75;
      shoulderL = shoulderR = 0;
      elbowL = elbowR = -0.25;
      hipL = hipR = 0;
      kneeL = kneeR = 0.25 * Math.abs(Math.cos(this.time * 7 + i));
      lean = -0.08;
    } else if (sulking) {
      lean = 0.22;
      shoulderL = shoulderR = 0.1;
      elbowL = elbowR = -0.1;
    }
    if (rig.down > 0.5) {
      // on the floor after a caño, kicking the air
      hipL = -1.0 + Math.sin(this.time * 9) * 0.25;
      hipR = -0.7 - Math.sin(this.time * 9) * 0.25;
      kneeL = kneeR = 0.9;
      spreadL = -1.2;
      spreadR = 1.2;
    }

    rig.legL.rotation.x = hipL;
    rig.legR.rotation.x = hipR;
    rig.kneeL.rotation.x = kneeL;
    rig.kneeR.rotation.x = kneeR;
    rig.armL.rotation.set(shoulderL, 0, spreadL);
    rig.armR.rotation.set(shoulderR, 0, spreadR);
    rig.elbowL.rotation.x = elbowL;
    rig.elbowR.rotation.x = elbowR;

    rig.root.rotation.y = rig.angle + spin;
    rig.body.rotation.x = lean * (1 - rig.down) - (Math.PI / 2) * rig.down;
    rig.body.position.y = lift * (1 - rig.down) + 0.17 * rig.down;

    const crack = s.crackMs[p.team] > 0;
    rig.crackRing.visible = crack;
    if (crack) {
      const pulse = 1 + Math.sin(this.time * 9) * 0.12;
      rig.crackRing.scale.set(pulse, pulse, 1);
    }
  }

  private animateBall(s: StreetState, dt: number) {
    const b = s.ball;
    const speed = Math.hypot(b.vx, b.vy) * K;
    const free = s.holder < 0;

    // The engine is flat; the lift is only for show. A struck ball pops up
    // and bounces down, a carried ball stays glued to the boot.
    if (free && !this.ballWasFree && speed > 9) this.ballVy = Math.min(5.2, speed * 0.2);
    this.ballWasFree = free;
    if (free) {
      this.ballVy -= 16 * dt;
      this.ballHeight += this.ballVy * dt;
      if (this.ballHeight <= 0) {
        this.ballHeight = 0;
        this.ballVy = this.ballVy < -1.5 ? -this.ballVy * 0.5 : 0;
      }
    } else {
      this.ballHeight += (0 - this.ballHeight) * Math.min(1, 14 * dt);
      this.ballVy = 0;
    }

    let x = toX(this.shown[12]);
    let z = toZ(this.shown[13]);
    if (!free) {
      // dribbling touch: the ball rolls a little ahead and back with each stride
      const h = s.players[s.holder];
      const push = Math.max(0, Math.sin(this.rigs[s.holder].phase * 2)) * 0.22 * Math.min(1, speed / 4);
      x += h.fx * push;
      z += h.fy * push;
    }
    this.ball.position.set(x, BALL_RADIUS + this.ballHeight, z);
    if (speed > 0.05) {
      const axis = new THREE.Vector3(b.vy, 0, -b.vx).normalize();
      this.ball.rotateOnWorldAxis(axis, (speed * dt) / BALL_RADIUS);
    }
    this.ballShadow.position.set(x, 0.025, z);
    this.ballShadow.scale.setScalar(Math.max(0.45, 1 - this.ballHeight * 0.3));
  }

  private animateCrowd(s: StreetState) {
    const excited = s.phase === 'goal';
    for (let i = 0; i < this.crowdBase.length; i++) {
      const p = this.crowdBase[i];
      const bounce = excited ? Math.abs(Math.sin(this.time * 8 + i * 1.7)) * 0.45 : Math.sin(this.time * 1.6 + i) * 0.03;
      this.dummy.position.set(p.x, 1.15 + p.y + bounce, p.z);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.updateMatrix();
      this.crowd.setMatrixAt(i, this.dummy.matrix);
    }
    this.crowd.instanceMatrix.needsUpdate = true;
  }

  private updateMarker(s: StreetState) {
    const p = s.players[s.controlled[this.viewTeam]];
    this.marker.visible = !!p && s.phase !== 'ended';
    if (!p) return;
    const index = s.controlled[this.viewTeam];
    this.marker.position.set(toX(this.shown[index * 2]), 0, toZ(this.shown[index * 2 + 1]));
    const arrow = this.marker.getObjectByName('arrow');
    if (arrow) arrow.position.y = 2.6 + Math.sin(this.time * 5) * 0.07;
  }

  private updateCamera(s: StreetState, dt: number) {
    const bx = toX(this.shown[12]);
    const bz = toZ(this.shown[13]);
    const index = s.controlled[this.viewTeam];
    const ax = index >= 0 ? toX(this.shown[index * 2]) : bx;
    const az = index >= 0 ? toZ(this.shown[index * 2 + 1]) : bz;

    // follow mostly the ball, a little the player being controlled
    const tx = bx * 0.72 + ax * 0.28;
    const tz = bz * 0.72 + az * 0.28;
    const ease = Math.min(1, 3.2 * dt);
    this.focus.x += (tx - this.focus.x) * ease;
    this.focus.z += (tz - this.focus.z) * ease;

    // pull back when the play is spread out, push in when it's tight; goals get a close-up
    const spread = Math.hypot(bx - ax, bz - az);
    let zoomTarget = 0.84 + Math.min(1, spread / 12) * 0.2;
    if (s.phase === 'goal') zoomTarget = 0.66;
    this.zoom += (zoomTarget - this.zoom) * Math.min(1, 2.2 * dt);

    // a tall, narrow screen needs the camera further back to keep the play in frame
    const narrow = Math.max(1, 1.55 / this.camera.aspect);
    const dist = this.zoom * narrow;
    const camX = this.focus.x * 0.62;
    const camZ = this.focus.z * 0.3 + 16.5 * dist;
    const camY = 11 * dist;

    this.shake *= Math.exp(-6 * dt);
    const jx = (Math.random() - 0.5) * this.shake * 0.9;
    const jy = (Math.random() - 0.5) * this.shake * 0.7;

    this.camera.position.set(camX + jx, camY + jy, camZ);
    this.camera.lookAt(this.focus.x * 0.86, 1.4, this.focus.z * 0.5 - 2.2);
    const fov = 38 - this.shake * 3;
    if (Math.abs(this.camera.fov - fov) > 0.01) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }

  /** Floating labels (¡CAÑO!, ¡Gambeta!...) are HTML, pinned to their spot on the court. */
  private updatePopups(s: StreetState) {
    const alive = new Set(s.popups.map((q) => q.id));
    for (const [id, node] of this.popupNodes) {
      if (!alive.has(id)) {
        node.remove();
        this.popupNodes.delete(id);
      }
    }
    const v = new THREE.Vector3();
    const placed: Array<{ left: number; top: number }> = [];
    for (const q of s.popups) {
      let node = this.popupNodes.get(q.id);
      if (!node) {
        const big = q.text.includes('CRACK');
        if (!this.seenPopups.has(q.id)) {
          this.seenPopups.add(q.id);
          if (q.text.includes('CAÑO')) this.addShake(0.35);
          if (big) this.addShake(0.5);
        }
        node = document.createElement('div');
        node.textContent = q.text;
        node.style.cssText = [
          'position:absolute',
          'transform:translate(-50%,-50%)',
          'white-space:nowrap',
          'font-family:Impact, system-ui, sans-serif',
          'font-style:italic',
          'letter-spacing:1px',
          `font-size:${big ? 'clamp(26px, 5vw, 54px)' : 'clamp(16px, 2.6vw, 30px)'}`,
          `color:${big ? '#ffd64a' : this.looks[q.team].primary}`,
          '-webkit-text-stroke:1.5px rgba(0,0,0,0.9)',
          'text-shadow:0 3px 0 rgba(0,0,0,0.75), 0 0 16px rgba(0,0,0,0.6)',
          'animation:street-popup 1.1s ease-out forwards',
        ].join(';');
        this.overlay.appendChild(node);
        this.popupNodes.set(q.id, node);
      }
      const centre = q.text.includes('CRACK');
      v.set(toX(q.x), centre ? 2.8 : 2.2, toZ(q.y + PLAYER_R)).project(this.camera);
      const left = Math.max(8, Math.min(92, (v.x * 0.5 + 0.5) * 100));
      let top = Math.max(8, Math.min(88, (-v.y * 0.5 + 0.5) * 100));
      // two labels on the same spot (a gambeta that ends in a caño) go one above the other
      while (placed.some((o) => Math.abs(o.left - left) < 14 && Math.abs(o.top - top) < 7)) top -= 7;
      placed.push({ left, top });
      node.style.left = `${left}%`;
      node.style.top = `${top}%`;
    }
  }

  dispose() {
    for (const node of this.popupNodes.values()) node.remove();
    this.popupNodes.clear();
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else material?.dispose();
    });
    this.disposables.forEach((d) => d.dispose());
    this.renderer.dispose();
  }
}
