import { FIELD_HEIGHT, FIELD_WIDTH, GROUND_Y, GOAL_HEIGHT } from '../../lib/headSoccer/physics';
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

const PITCH_TOP = 150;
const STAND_HEIGHT = PITCH_TOP;
const TRACK_WIDTH = 14;

/** Crowd dots are precomputed once (not per frame) so they don't flicker —
 * a cheap stand-in for a drawn/illustrated crowd (no external assets). */
const CROWD_DOTS = (() => {
  const dots: { x: number; y: number; color: string }[] = [];
  const palette = ['#2d6fb0', '#c94040', '#d9b23a', '#3aa15a', '#e8e8ea', '#8a4fc9'];
  let seed = 7;
  function rand() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }
  const rows = 7;
  for (let row = 0; row < rows; row++) {
    const y = 14 + row * ((STAND_HEIGHT - 24) / rows);
    const count = 26 + row * 2;
    for (let i = 0; i < count; i++) {
      const x = (i / count) * FIELD_WIDTH + (rand() - 0.5) * 8;
      dots.push({ x, y: y + (rand() - 0.5) * 6, color: palette[Math.floor(rand() * palette.length)] });
    }
  }
  return dots;
})();

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  p1: { primary: string; secondary: string },
  p2: { primary: string; secondary: string },
  confetti: ConfettiParticle[],
  p1Photo: HTMLImageElement | null,
  p2Photo: HTMLImageElement | null
) {
  ctx.clearRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
  drawStadium(ctx);
  drawPitch(ctx);
  drawGoal(ctx, 0);
  drawGoal(ctx, FIELD_WIDTH);
  drawPlayer(ctx, state.players[0], p1, p1Photo);
  drawPlayer(ctx, state.players[1], p2, p2Photo);
  drawBall(ctx, state.ball);
  drawConfetti(ctx, confetti);
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

function drawStadium(ctx: CanvasRenderingContext2D) {
  const sky = ctx.createLinearGradient(0, 0, 0, STAND_HEIGHT);
  sky.addColorStop(0, '#7fb8d9');
  sky.addColorStop(1, '#3f6b8a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, FIELD_WIDTH, STAND_HEIGHT);

  // Grandstand silhouette (a few stepped bands) behind the crowd dots.
  ctx.fillStyle = '#2a4a63';
  ctx.fillRect(0, STAND_HEIGHT - 26, FIELD_WIDTH, 26);
  ctx.fillStyle = '#244058';
  ctx.fillRect(0, STAND_HEIGHT - 14, FIELD_WIDTH, 14);

  for (const d of CROWD_DOTS) {
    ctx.fillStyle = d.color;
    ctx.beginPath();
    ctx.arc(d.x, d.y, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Floodlight glow accents
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.arc(60, 18, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(FIELD_WIDTH - 60, 18, 10, 0, Math.PI * 2);
  ctx.fill();
}

function drawPitch(ctx: CanvasRenderingContext2D) {
  // Running-track border
  ctx.fillStyle = '#8a5a2e';
  ctx.fillRect(0, PITCH_TOP, FIELD_WIDTH, FIELD_HEIGHT - PITCH_TOP);

  const grassTop = PITCH_TOP + TRACK_WIDTH;
  const grassHeight = FIELD_HEIGHT - grassTop;

  // Mowed-stripe grass
  const stripeWidth = 40;
  for (let x = 0, i = 0; x < FIELD_WIDTH; x += stripeWidth, i++) {
    ctx.fillStyle = i % 2 === 0 ? '#3fae53' : '#379848';
    ctx.fillRect(x, grassTop, stripeWidth, grassHeight);
  }

  // Pitch lines
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 3;
  ctx.strokeRect(TRACK_WIDTH, grassTop + 4, FIELD_WIDTH - TRACK_WIDTH * 2, grassHeight - TRACK_WIDTH);

  ctx.beginPath();
  ctx.moveTo(FIELD_WIDTH / 2, grassTop + 4);
  ctx.lineTo(FIELD_WIDTH / 2, FIELD_HEIGHT - TRACK_WIDTH);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(FIELD_WIDTH / 2, GROUND_Y - 70, 44, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(FIELD_WIDTH / 2, GROUND_Y - 70, 3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fill();

  // Goal-area boxes
  const boxWidth = 70;
  const boxHeight = GOAL_HEIGHT + 30;
  ctx.strokeRect(TRACK_WIDTH, GROUND_Y - boxHeight, boxWidth, boxHeight);
  ctx.strokeRect(FIELD_WIDTH - TRACK_WIDTH - boxWidth, GROUND_Y - boxHeight, boxWidth, boxHeight);

  // Ground/horizon line (visually separates pitch from the goal mouth posts)
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(FIELD_WIDTH, GROUND_Y);
  ctx.stroke();
}

function drawGoal(ctx: CanvasRenderingContext2D, edgeX: number) {
  const depth = 22;
  const dir = edgeX === 0 ? 1 : -1;
  const postX = edgeX;
  const topY = GROUND_Y - GOAL_HEIGHT;

  ctx.strokeStyle = '#f5f5f5';
  ctx.lineWidth = 4;
  ctx.strokeRect(Math.min(postX, postX + dir * depth), topY, Math.abs(depth), GOAL_HEIGHT);

  // Net
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    const x = postX + dir * (depth * (i / 4));
    ctx.beginPath();
    ctx.moveTo(x, topY);
    ctx.lineTo(x, GROUND_Y);
    ctx.stroke();
  }
  for (let i = 1; i < 5; i++) {
    const y = topY + (GOAL_HEIGHT * i) / 5;
    ctx.beginPath();
    ctx.moveTo(postX, y);
    ctx.lineTo(postX + dir * depth, y);
    ctx.stroke();
  }
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  p: GameState['players'][number],
  team: { primary: string; secondary: string },
  photo: HTMLImageElement | null
) {
  // "Chibi" proportions like the reference: huge head sitting almost
  // directly on the shoulders (barely any neck), small simple torso. The
  // jersey's top few pixels tuck under the head circle (drawn after, i.e.
  // on top) so the seam is covered — a small overlap, not the whole jersey.
  const jerseyTop = p.y + p.headRadius * 0.78;
  const jerseyHeight = p.bodyHeight * 0.46;
  const shortsTop = jerseyTop + jerseyHeight * 0.88;
  const shortsHeight = p.bodyHeight * 0.3;
  const sockTop = shortsTop + shortsHeight * 0.85;
  const sockHeight = p.bodyHeight * 0.26;
  const feetY = sockTop + sockHeight;

  // Arm nubs
  ctx.fillStyle = team.primary;
  ctx.beginPath();
  ctx.ellipse(p.x - p.bodyWidth / 2 - 3, jerseyTop + jerseyHeight * 0.45, 6, 11, 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(p.x + p.bodyWidth / 2 + 3, jerseyTop + jerseyHeight * 0.45, 6, 11, -0.25, 0, Math.PI * 2);
  ctx.fill();

  // Socks
  ctx.fillStyle = team.secondary;
  ctx.beginPath();
  ctx.roundRect(p.x - p.bodyWidth / 2 + 2, sockTop, p.bodyWidth / 2 - 4, sockHeight, 3);
  ctx.roundRect(p.x + 4, sockTop, p.bodyWidth / 2 - 4, sockHeight, 3);
  ctx.fill();

  // Shoes
  ctx.fillStyle = '#242424';
  ctx.beginPath();
  ctx.ellipse(p.x - p.bodyWidth / 2 + 7, feetY, 10, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(p.x + p.bodyWidth / 2 - 7, feetY, 10, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Shorts — white like the reference, so the team color reads on the
  // jersey/socks instead of everywhere at once.
  ctx.fillStyle = '#f2f2f2';
  ctx.beginPath();
  ctx.roundRect(p.x - p.bodyWidth / 2, shortsTop, p.bodyWidth, shortsHeight, 5);
  ctx.fill();

  // Jersey
  ctx.fillStyle = team.primary;
  ctx.beginPath();
  ctx.roundRect(p.x - p.bodyWidth / 2, jerseyTop, p.bodyWidth, jerseyHeight, 9);
  ctx.fill();

  drawHead(ctx, p, photo);
}

function drawHead(ctx: CanvasRenderingContext2D, p: GameState['players'][number], photo: HTMLImageElement | null) {
  if (photo && photo.complete && photo.naturalWidth > 0) {
    // Real player photo (see `useGameLoop`'s image preloading), clipped to a
    // circle and covering the head hitbox — same role as the cartoon face
    // below, just a real headshot instead of a drawn one.
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.headRadius, 0, Math.PI * 2);
    ctx.clip();
    const srcSize = Math.min(photo.naturalWidth, photo.naturalHeight);
    const srcX = (photo.naturalWidth - srcSize) / 2;
    const srcY = (photo.naturalHeight - srcSize) / 2.6; // bias up: these are chest-up portraits
    ctx.drawImage(photo, srcX, srcY, srcSize, srcSize, p.x - p.headRadius, p.y - p.headRadius, p.headRadius * 2, p.headRadius * 2);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.headRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    return;
  }

  // Fallback cartoon head, shown until the real photo finishes loading.
  ctx.beginPath();
  ctx.fillStyle = '#e8b082';
  ctx.arc(p.x, p.y, p.headRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#3a2a1e';
  ctx.beginPath();
  ctx.arc(p.x, p.y - p.headRadius * 0.35, p.headRadius * 0.92, Math.PI, 0);
  ctx.fill();

  const eyeOffsetX = p.facing * p.headRadius * 0.35;
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(p.x + eyeOffsetX - 3, p.y - 2, 2.6, 0, Math.PI * 2);
  ctx.arc(p.x + eyeOffsetX + 9, p.y - 2, 2.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.x + eyeOffsetX + 3, p.y + 8, 7, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
}

function drawBall(ctx: CanvasRenderingContext2D, ball: GameState['ball']) {
  ctx.beginPath();
  ctx.fillStyle = '#f5f5f5';
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3a3a3a';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Simplified pentagon pattern for a classic-ball look
  ctx.fillStyle = '#2a2a2a';
  const r = ball.radius * 0.42;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    const px = ball.x + Math.cos(angle) * r;
    const py = ball.y + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}
