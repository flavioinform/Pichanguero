import { FIELD_HEIGHT, FIELD_WIDTH, GOAL_DEPTH, GROUND_Y, GOAL_HEIGHT } from '../../lib/headSoccer/physics';
import type { GameState } from '../../lib/headSoccer/types';

export interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  lifeMs: number;
}

const CONFETTI_COLORS = ['#2d6fb0', '#c94040', '#d9b23a', '#3aa15a', '#8a4fc9', '#ffffff'];
const CONFETTI_GRAVITY = 900;

export function spawnConfetti(x: number, y: number): ConfettiParticle[] {
  const particles: ConfettiParticle[] = [];
  for (let i = 0; i < 36; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 120 + Math.random() * 260;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 150,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      lifeMs: 900 + Math.random() * 400,
    });
  }
  return particles;
}

export function updateConfetti(particles: ConfettiParticle[], dtMs: number): ConfettiParticle[] {
  const dtSec = dtMs / 1000;
  const next: ConfettiParticle[] = [];
  for (const p of particles) {
    const lifeMs = p.lifeMs - dtMs;
    if (lifeMs <= 0) continue;
    next.push({
      ...p,
      x: p.x + p.vx * dtSec,
      y: p.y + p.vy * dtSec,
      vy: p.vy + CONFETTI_GRAVITY * dtSec,
      lifeMs,
    });
  }
  return next;
}

/** Layout of the scene, top to bottom (canvas is FIELD_WIDTH x FIELD_HEIGHT). */
const STANDS_TOP = 54;
const BARRIER_TOP = 236;
const BOARDS_TOP = 262;
const PITCH_TOP = 292;
const FAR_LINE_Y = 312;
const NEAR_LINE_Y = FIELD_HEIGHT - 16;
const GOAL_TOP = GROUND_Y - GOAL_HEIGHT;
const OUTLINE = '#16181d';

interface Fan {
  x: number;
  y: number;
  shirt: string;
  skin: string;
  hair: string;
  phase: number;
}

/** The crowd is laid out once (not per frame) so it doesn't flicker; each fan
 * only bobs up and down a little, more when a goal has just been scored. */
const FANS: Fan[] = (() => {
  const fans: Fan[] = [];
  const shirts = ['#e4572e', '#f2c14e', '#4f9dde', '#e8e8ea', '#8a4fc9', '#3aa15a', '#e86a92', '#f08a4b'];
  const skins = ['#f1c9a5', '#e0a878', '#c68a5c', '#8d5a3b', '#f6d7bd'];
  const hairs = ['#2b1d14', '#5a3a22', '#111111', '#b8792f', '#7a7a7a'];
  let seed = 11;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const rows = 6;
  const rowGap = (BARRIER_TOP - STANDS_TOP - 20) / rows;
  for (let row = 0; row < rows; row++) {
    const y = STANDS_TOP + 26 + row * rowGap;
    const spacing = 27;
    const offset = row % 2 === 0 ? 0 : spacing / 2;
    for (let x = -spacing + offset; x < FIELD_WIDTH + spacing; x += spacing) {
      fans.push({
        x: x + (rand() - 0.5) * 5,
        y,
        shirt: shirts[Math.floor(rand() * shirts.length)],
        skin: skins[Math.floor(rand() * skins.length)],
        hair: hairs[Math.floor(rand() * hairs.length)],
        phase: rand() * Math.PI * 2,
      });
    }
  }
  return fans;
})();

export interface TeamVisual {
  primary: string;
  secondary: string;
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  p1: TeamVisual,
  p2: TeamVisual,
  confetti: ConfettiParticle[],
  labels: [string, string] = ['P1', 'P2']
) {
  const timeMs = performance.now();
  ctx.clearRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
  drawStadium(ctx, timeMs, state.phase === 'goal_pause');
  drawPitch(ctx);
  drawGoalBack(ctx, 'left');
  drawGoalBack(ctx, 'right');
  for (const p of state.players) drawShadow(ctx, p.x, p.y + p.headRadius + p.bodyHeight, 30);
  drawShadow(ctx, state.ball.x, state.ball.y + state.ball.radius, 15);
  drawPlayer(ctx, state.players[0], p1, faceFor(labels[0]));
  drawPlayer(ctx, state.players[1], p2, faceFor(labels[1]));
  drawBall(ctx, state.ball);
  drawGoalFront(ctx, 'left');
  drawGoalFront(ctx, 'right');
  drawConfetti(ctx, confetti);
  drawScoreboard(ctx, state, p1, p2, labels);
}

function drawConfetti(ctx: CanvasRenderingContext2D, particles: ConfettiParticle[]) {
  for (const p of particles) {
    ctx.fillStyle = p.color;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate((p.x + p.y) * 0.05);
    ctx.fillRect(-4, -3, 8, 6);
    ctx.restore();
  }
}

function drawStadium(ctx: CanvasRenderingContext2D, timeMs: number, celebrating: boolean) {
  // night sky
  const sky = ctx.createLinearGradient(0, 0, 0, STANDS_TOP + 30);
  sky.addColorStop(0, '#141a3a');
  sky.addColorStop(1, '#2f3f78');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, FIELD_WIDTH, BARRIER_TOP);

  const tiers = ctx.createLinearGradient(0, STANDS_TOP, 0, BARRIER_TOP);
  tiers.addColorStop(0, '#39457a');
  tiers.addColorStop(1, '#4d5d99');
  ctx.fillStyle = tiers;
  ctx.fillRect(0, STANDS_TOP, FIELD_WIDTH, BARRIER_TOP - STANDS_TOP);

  let lastRowY = -1;
  for (const fan of FANS) {
    if (fan.y !== lastRowY) {
      // the step this row sits on
      lastRowY = fan.y;
      ctx.fillStyle = 'rgba(15,20,50,0.35)';
      ctx.fillRect(0, fan.y + 9, FIELD_WIDTH, 5);
    }
    const bob = Math.sin(timeMs / (celebrating ? 90 : 420) + fan.phase) * (celebrating ? 5 : 1.4);
    const y = fan.y + bob;
    ctx.fillStyle = fan.shirt;
    ctx.beginPath();
    ctx.roundRect(fan.x - 10, y - 2, 20, 22, 7);
    ctx.fill();
    if (celebrating) {
      // arms up
      ctx.strokeStyle = fan.shirt;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(fan.x - 8, y + 2);
      ctx.lineTo(fan.x - 13, y - 13);
      ctx.moveTo(fan.x + 8, y + 2);
      ctx.lineTo(fan.x + 13, y - 13);
      ctx.stroke();
    }
    ctx.fillStyle = fan.skin;
    ctx.beginPath();
    ctx.arc(fan.x, y - 9, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = fan.hair;
    ctx.beginPath();
    ctx.arc(fan.x, y - 11, 8, Math.PI, 0);
    ctx.fill();
  }

  // the crowd sits in the dark, away from the lights
  const shade = ctx.createLinearGradient(0, STANDS_TOP, 0, BARRIER_TOP);
  shade.addColorStop(0, 'rgba(20,24,60,0.55)');
  shade.addColorStop(1, 'rgba(20,24,60,0.12)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, STANDS_TOP, FIELD_WIDTH, BARRIER_TOP - STANDS_TOP);

  // floodlights
  for (const x of [70, 250, FIELD_WIDTH - 250, FIELD_WIDTH - 70]) {
    const glow = ctx.createRadialGradient(x, 30, 2, x, 30, 80);
    glow.addColorStop(0, 'rgba(255,255,240,0.85)');
    glow.addColorStop(0.25, 'rgba(255,255,230,0.3)');
    glow.addColorStop(1, 'rgba(255,255,230,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 80, -50, 160, 160);
    ctx.fillStyle = '#2a2f45';
    ctx.fillRect(x - 3, 40, 6, 22);
    ctx.fillStyle = '#3a4060';
    ctx.beginPath();
    ctx.roundRect(x - 26, 18, 52, 24, 5);
    ctx.fill();
    ctx.fillStyle = '#fffbe0';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(x - 18 + i * 12, 30, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // glass barrier in front of the crowd
  ctx.fillStyle = 'rgba(120,190,235,0.55)';
  ctx.fillRect(0, BARRIER_TOP, FIELD_WIDTH, BOARDS_TOP - BARRIER_TOP);
  ctx.fillStyle = '#2f8f4e';
  for (let x = 20; x < FIELD_WIDTH; x += 95) ctx.fillRect(x, BARRIER_TOP - 4, 7, BOARDS_TOP - BARRIER_TOP + 4);
  ctx.fillStyle = '#e9edf2';
  ctx.fillRect(0, BARRIER_TOP - 4, FIELD_WIDTH, 4);

  // pitch-side wall
  const wall = ctx.createLinearGradient(0, BOARDS_TOP, 0, PITCH_TOP);
  wall.addColorStop(0, '#8d93a6');
  wall.addColorStop(1, '#5f6577');
  ctx.fillStyle = wall;
  ctx.fillRect(0, BOARDS_TOP, FIELD_WIDTH, PITCH_TOP - BOARDS_TOP);
}

function drawPitch(ctx: CanvasRenderingContext2D) {
  // grass in horizontal bands, wider as they get closer
  const bands = ['#3cb055', '#35a04c'];
  let y = PITCH_TOP;
  let h = 14;
  for (let i = 0; y < FIELD_HEIGHT; i++) {
    ctx.fillStyle = bands[i % 2];
    ctx.fillRect(0, y, FIELD_WIDTH, h + 1);
    y += h;
    h *= 1.28;
  }

  // lighter rings around the centre spot
  const cx = FIELD_WIDTH / 2;
  const cy = (FAR_LINE_Y + NEAR_LINE_Y) / 2;
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (const scale of [1, 0.66]) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, 250 * scale, 58 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 3.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'butt';

  // touchlines, seen in perspective
  const farInset = 70;
  const nearInset = 26;
  ctx.beginPath();
  ctx.moveTo(farInset, FAR_LINE_Y);
  ctx.lineTo(FIELD_WIDTH - farInset, FAR_LINE_Y);
  ctx.lineTo(FIELD_WIDTH - nearInset, NEAR_LINE_Y);
  ctx.lineTo(nearInset, NEAR_LINE_Y);
  ctx.closePath();
  ctx.stroke();

  // halfway line + centre circle
  ctx.beginPath();
  ctx.moveTo(cx, FAR_LINE_Y);
  ctx.lineTo(cx, NEAR_LINE_Y);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx, cy, 58, 21, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 5, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // goal areas
  for (const side of [1, -1]) {
    const edge = side === 1 ? 0 : FIELD_WIDTH;
    const boxTop = FAR_LINE_Y + 26;
    const boxBottom = NEAR_LINE_Y - 22;
    const slope = (farInset - nearInset) / (NEAR_LINE_Y - FAR_LINE_Y);
    const lineX = (yy: number) => edge + side * (farInset - (yy - FAR_LINE_Y) * slope);
    ctx.beginPath();
    ctx.moveTo(lineX(boxTop), boxTop);
    ctx.lineTo(lineX(boxTop) + side * 92, boxTop);
    ctx.lineTo(lineX(boxBottom) + side * 106, boxBottom);
    ctx.lineTo(lineX(boxBottom), boxBottom);
    ctx.stroke();
  }
}

function drawShadow(ctx: CanvasRenderingContext2D, x: number, bottomY: number, width: number) {
  // shrinks as the thing leaves the ground
  const height = Math.max(0, GROUND_Y - bottomY);
  const scale = Math.max(0.35, 1 - height / 260);
  ctx.fillStyle = `rgba(0,0,0,${0.28 * scale})`;
  ctx.beginPath();
  ctx.ellipse(x, GROUND_Y + 5, width * scale, 6 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Goal geometry for one side. The goal line is the edge of the field, so the
 * net is drawn just inside it: the ball visibly ends up in the net. */
function goalShape(side: 'left' | 'right') {
  const dir = side === 'left' ? 1 : -1;
  const edge = side === 'left' ? 0 : FIELD_WIDTH;
  const at = (dx: number) => edge + dir * dx;
  return {
    backX: at(4),
    backNearX: at(13),
    farPostX: at(34),
    nearPostX: at(GOAL_DEPTH),
    backTop: GOAL_TOP + 6,
    backBottom: GROUND_Y - 8,
    farTop: GOAL_TOP - 8,
    farBottom: GROUND_Y - 6,
    nearTop: GOAL_TOP - 2,
    nearBottom: GROUND_Y + 12,
  };
}

function drawNetPanel(ctx: CanvasRenderingContext2D, pts: Array<[number, number]>) {
  ctx.save();
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fill();
  ctx.clip();
  const xs = pts.map((q) => q[0]);
  const ys = pts.map((q) => q[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const span = maxY - minY;
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let d = minX - span; d < maxX + span; d += 9) {
    ctx.moveTo(d, minY);
    ctx.lineTo(d + span, maxY);
    ctx.moveTo(d + span, minY);
    ctx.lineTo(d, maxY);
  }
  ctx.stroke();
  ctx.restore();
}

function drawPost(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, width: number) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = width + 3;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.strokeStyle = '#f7f7f7';
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  // warning stripes
  ctx.strokeStyle = '#e8743b';
  ctx.lineCap = 'butt';
  const len = Math.hypot(x2 - x1, y2 - y1);
  for (let d = 18; d < len - 6; d += 34) {
    const t0 = d / len;
    const t1 = (d + 9) / len;
    ctx.beginPath();
    ctx.moveTo(x1 + (x2 - x1) * t0, y1 + (y2 - y1) * t0);
    ctx.lineTo(x1 + (x2 - x1) * t1, y1 + (y2 - y1) * t1);
    ctx.stroke();
  }
}

/** Net and far post: behind the players and the ball. */
function drawGoalBack(ctx: CanvasRenderingContext2D, side: 'left' | 'right') {
  const g = goalShape(side);
  drawNetPanel(ctx, [
    [g.backX, g.backTop],
    [g.farPostX, g.farTop],
    [g.farPostX, g.farBottom],
    [g.backX, g.backBottom],
  ]);
  // roof
  drawNetPanel(ctx, [
    [g.backX, g.backTop],
    [g.farPostX, g.farTop],
    [g.nearPostX, g.nearTop],
    [g.backNearX, g.backTop + 6],
  ]);
  drawPost(ctx, g.farPostX, g.farBottom, g.farPostX, g.farTop, 5);
}

/** Near side of the net, crossbar and near post: in front of everything. */
function drawGoalFront(ctx: CanvasRenderingContext2D, side: 'left' | 'right') {
  const g = goalShape(side);
  drawNetPanel(ctx, [
    [g.backNearX, g.backTop + 6],
    [g.nearPostX, g.nearTop],
    [g.nearPostX, g.nearBottom],
    [g.backNearX, g.backBottom + 14],
  ]);
  drawPost(ctx, g.farPostX, g.farTop, g.nearPostX, g.nearTop, 6);
  drawPost(ctx, g.nearPostX, g.nearBottom, g.nearPostX, g.nearTop, 7);
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  p: GameState['players'][number],
  team: TeamVisual,
  face: Face
) {
  // "Chibi" proportions: a huge head sitting almost directly on the
  // shoulders, a small torso and big boots. Every part gets a dark outline.
  const jerseyTop = p.y + p.headRadius * 0.78;
  const jerseyHeight = p.bodyHeight * 0.46;
  const shortsTop = jerseyTop + jerseyHeight * 0.88;
  const shortsHeight = p.bodyHeight * 0.3;
  const sockTop = shortsTop + shortsHeight * 0.85;
  const sockHeight = p.bodyHeight * 0.26;
  // the kick cooldown starts at its maximum right after a kick: swing the front leg
  const kicking = p.kickCooldownMs > 180;
  const front = p.facing;

  ctx.lineWidth = 2.5;
  ctx.strokeStyle = OUTLINE;
  ctx.lineJoin = 'round';

  // arms
  ctx.fillStyle = team.primary;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(p.x + side * (p.bodyWidth / 2 + 3), jerseyTop + jerseyHeight * 0.45, 6, 11, side * -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // legs: back one first, then the front one (which swings on a kick)
  for (const side of [-front, front]) {
    const swing = side === front && kicking;
    ctx.save();
    ctx.translate(p.x + side * (p.bodyWidth / 4), sockTop);
    if (swing) ctx.rotate(-front * 0.95);
    ctx.fillStyle = team.secondary;
    ctx.beginPath();
    ctx.roundRect(-7, 0, 14, sockHeight, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#23262d';
    ctx.beginPath();
    ctx.ellipse(front * 5, sockHeight + 1, 14, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f2f2f2';
    ctx.fillRect(front * 5 - 3, sockHeight - 4, 6, 3);
    ctx.restore();
  }

  // shorts
  ctx.fillStyle = '#f2f2f2';
  ctx.beginPath();
  ctx.roundRect(p.x - p.bodyWidth / 2, shortsTop, p.bodyWidth, shortsHeight, 5);
  ctx.fill();
  ctx.stroke();

  // jersey
  ctx.fillStyle = team.primary;
  ctx.beginPath();
  ctx.roundRect(p.x - p.bodyWidth / 2, jerseyTop, p.bodyWidth, jerseyHeight, 9);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = team.secondary;
  ctx.fillRect(p.x - 3, jerseyTop + 6, 6, jerseyHeight - 8);

  drawHead(ctx, p, face);
}

type HairStyle = 'short' | 'bun' | 'mohawk' | 'curly' | 'bald';

interface Face {
  skin: string;
  hair: string;
  style: HairStyle;
  beard: boolean;
}

const FACE_CACHE = new Map<string, Face>();

/** A caricature per team, always the same for the same name. */
function faceFor(seed: string): Face {
  const cached = FACE_CACHE.get(seed);
  if (cached) return cached;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const pick = <T,>(options: T[]): T => {
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return options[(h >>> 0) % options.length];
  };
  const face: Face = {
    skin: pick(['#f3c9a2', '#e8b082', '#d39a6a', '#b07a4f', '#8a5a3a']),
    hair: pick(['#2b1d14', '#4a2f1b', '#111111', '#a86a2a', '#d8b25a']),
    style: pick<HairStyle>(['short', 'bun', 'mohawk', 'curly', 'bald', 'short']),
    beard: pick([true, false, false]),
  };
  FACE_CACHE.set(seed, face);
  return face;
}

function drawHead(ctx: CanvasRenderingContext2D, p: GameState['players'][number], face: Face) {
  const r = p.headRadius;
  const f = p.facing;

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // hair that sticks out behind the head goes first
  ctx.fillStyle = face.hair;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3;
  if (face.style === 'bun') {
    ctx.beginPath();
    ctx.arc(-f * r * 0.55, -r * 0.92, r * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (face.style === 'mohawk') {
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, -r * 0.8);
    ctx.lineTo(-r * 0.12, -r * 1.42);
    ctx.lineTo(r * 0.05, -r * 1.05);
    ctx.lineTo(r * 0.2, -r * 1.38);
    ctx.lineTo(r * 0.36, -r * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (face.style === 'curly') {
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(i * r * 0.27, -r * 0.82 + Math.abs(i) * r * 0.1, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  // head
  ctx.fillStyle = face.skin;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // ear on the far side
  ctx.beginPath();
  ctx.arc(-f * r * 0.86, r * 0.08, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();
  if (face.beard) {
    ctx.fillStyle = face.hair;
    ctx.beginPath();
    ctx.ellipse(f * r * 0.12, r * 0.78, r * 0.95, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (face.style !== 'bald') {
    // hairline: a cap of hair, swept back from the face
    ctx.fillStyle = face.hair;
    ctx.beginPath();
    ctx.ellipse(-f * r * 0.22, -r * 0.82, r * 1.15, r * 0.62, f * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  // face, shifted towards where the player looks
  const cx = f * r * 0.24;
  for (const side of [-1, 1]) {
    const ex = cx + side * r * 0.3;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(ex, -r * 0.05, r * 0.17, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#15171c';
    ctx.beginPath();
    ctx.arc(ex + f * r * 0.06, -r * 0.03, r * 0.09, 0, Math.PI * 2);
    ctx.fill();
    // eyebrow, tilted for a game face
    ctx.strokeStyle = face.style === 'bald' ? '#2b1d14' : face.hair;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(ex - r * 0.19, -r * 0.36 - side * f * r * 0.05);
    ctx.lineTo(ex + r * 0.19, -r * 0.36 + side * f * r * 0.05);
    ctx.stroke();
    ctx.strokeStyle = OUTLINE;
  }

  // nose
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx + f * r * 0.06, r * 0.2, r * 0.1, -0.3 * Math.PI, 0.6 * Math.PI, f < 0);
  ctx.stroke();

  // grin
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.28, r * 0.42);
  ctx.quadraticCurveTo(cx, r * 0.78, cx + r * 0.3, r * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function drawBall(ctx: CanvasRenderingContext2D, ball: GameState['ball']) {
  // speed trail
  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed > 420) {
    const steps = 5;
    for (let i = steps; i >= 1; i--) {
      const back = i * 0.012 * Math.min(speed, 1100);
      ctx.fillStyle = `rgba(255,255,255,${0.22 * (1 - i / (steps + 1))})`;
      ctx.beginPath();
      ctx.arc(ball.x - (ball.vx / speed) * back, ball.y - (ball.vy / speed) * back, ball.radius * (1 - i * 0.1), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.beginPath();
  ctx.fillStyle = '#fafafa';
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();

  // panels that roll with the ball
  ctx.save();
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(ball.x, ball.y);
  ctx.rotate(ball.x / ball.radius);
  ctx.fillStyle = '#20232a';
  const pentagon = (cx: number, cy: number, r: number) => {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  };
  pentagon(0, 0, ball.radius * 0.4);
  for (let i = 0; i < 5; i++) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    pentagon(Math.cos(angle) * ball.radius * 1.02, Math.sin(angle) * ball.radius * 1.02, ball.radius * 0.38);
  }
  ctx.restore();

  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2.5;
  ctx.stroke();
}

function drawScoreboard(ctx: CanvasRenderingContext2D, state: GameState, p1: TeamVisual, p2: TeamVisual, labels: [string, string]) {
  const w = 236;
  const h = 78;
  const x = (FIELD_WIDTH - w) / 2;
  const y = 4;

  ctx.fillStyle = OUTLINE;
  ctx.beginPath();
  ctx.roundRect(x - 3, y - 3, w + 6, h + 6, 10);
  ctx.fill();
  const body = ctx.createLinearGradient(0, y, 0, y + h);
  body.addColorStop(0, '#6a6f7c');
  body.addColorStop(1, '#484c58');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();

  const seconds = Math.ceil(state.clockMs / 1000);
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const teams = [
    { cx: x + 46, label: labels[0], score: state.scoreP1, chip: p1.primary },
    { cx: x + w - 46, label: labels[1], score: state.scoreP2, chip: p2.primary },
  ];
  for (const t of teams) {
    ctx.fillStyle = '#2b2e37';
    ctx.beginPath();
    ctx.roundRect(t.cx - 34, y + 7, 68, 18, 4);
    ctx.fill();
    ctx.fillStyle = t.chip;
    ctx.beginPath();
    ctx.arc(t.cx - 23, y + 16, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 12px system-ui, sans-serif';
    ctx.fillText(t.label, t.cx + 6, y + 17);

    ctx.fillStyle = '#14161b';
    ctx.beginPath();
    ctx.roundRect(t.cx - 34, y + 30, 68, 40, 5);
    ctx.fill();
    ctx.fillStyle = '#39e75f';
    ctx.font = '900 30px system-ui, sans-serif';
    ctx.fillText(String(t.score), t.cx, y + 51);
  }

  ctx.fillStyle = '#14161b';
  ctx.beginPath();
  ctx.roundRect(x + w / 2 - 31, y + 34, 62, 30, 5);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 20px system-ui, sans-serif';
  ctx.fillText(clock, x + w / 2, y + 50);

  ctx.textAlign = 'start';
  ctx.textBaseline = 'alphabetic';
}
