/**
 * Fútbol callejero: a small 3v3 court with walls, simulated top-down.
 * Pure game logic (no DOM): `createStreetState` + `stepStreet` mutate a plain
 * state object, so the same engine can later drive an online mode.
 * Team 0 attacks the right goal, team 1 the left one.
 */
import { STREET } from '../../config/gameConfig';
import type { Stats } from './team';

export const COURT = { w: 800, h: 480, goalTop: 185, goalBottom: 295 };
export const PLAYER_R = 14;
export const BALL_R = 8;

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface StreetInput {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  pass: boolean;
  shoot: boolean;
  trick: boolean;
  /** change to the teammate closest to the ball */
  switch: boolean;
  /** this human prefers to change player only by hand (the switch key), not automatically */
  manualSwitch: boolean;
  /** sprint, held (Shift) */
  sprint: boolean;
}

export interface StreetPlayer {
  x: number;
  y: number;
  vx: number;
  vy: number;
  team: 0 | 1;
  role: 0 | 1 | 2;
  /** facing, unit vector */
  fx: number;
  fy: number;
  trickMs: number;
  trickCd: number;
  pickupCd: number;
  tackleMs: number;
  /** just lost the ball: can't win it straight back for a moment */
  tackleLockMs: number;
  /** on the floor after a caño: can't move, tackle or pick up the ball */
  stunMs: number;
  /** estadísticas del jugador (1 a 5, el 3 es lo normal) */
  skills: Stats;
  /** pase o tiro en curso (null si no está pateando) */
  kick: KickState | null;
  /** the current gambeta already put someone through a caño */
  canoDone: boolean;
  /** which move the current trickMs belongs to: the usual burst, or a cola de vaca (drag-back turn) */
  trickKind: 'gambeta' | 'cola';
  /** aire para el sprint: 0 a 1 */
  stamina: number;
  /** sprinting right now */
  sprinting: boolean;
  /** barrida en curso: lo que falta (deslizarse y después levantarse), su dirección, y si ya tocó la pelota */
  slideMs: number;
  slideCd: number;
  slideDx: number;
  slideDy: number;
  slideDone: boolean;
  aiMs: number;
}

/** Un pase o un tiro en curso: la preparación, el contacto (cuando sale la pelota) y el final del movimiento. */
export interface KickState {
  kind: 'pass' | 'shot';
  /** milisegundos desde que empezó */
  ms: number;
  /** en qué milisegundo la pierna toca la pelota */
  contactMs: number;
  /** ya pateó */
  done: boolean;
  aimX: number;
  aimY: number;
  aimDy: number;
  aimError: number;
  power: number;
}

export interface StreetPopup {
  /** stable across network snapshots, so a label is only announced once */
  id: number;
  text: string;
  x: number;
  y: number;
  ms: number;
  team: 0 | 1;
}

export interface StreetState {
  players: StreetPlayer[];
  ball: { x: number; y: number; vx: number; vy: number };
  /** index of the player carrying the ball, or -1 */
  holder: number;
  /** per team: index of the player its human controls, or -1 when the team is all CPU */
  controlled: [number, number];
  score: [number, number];
  clockMs: number;
  phase: 'intro' | 'playing' | 'goal' | 'ended';
  /** milisegundos que le quedan a la fase actual (goal e intro) */
  phaseMs: number;
  /** la intro larga de inicio o la corta de después de un gol */
  introKind: 'match' | 'restart';
  introTotalMs: number;
  lastScorer: 0 | 1 | null;
  winner: 0 | 1 | 'draw' | null;
  difficulty: Difficulty;
  /** which teams have a human at the controls (none: simulations and demos) */
  humans: [boolean, boolean];
  targetGoals: number;
  prev: [StreetInput, StreetInput];
  seed: number;
  /** style meter per team, 0-100 */
  style: [number, number];
  /** time left in "Modo Crack" per team */
  crackMs: [number, number];
  popups: StreetPopup[];
  /** per team: how long its human has been holding the shoot key */
  chargeMs: [number, number];
  popupSeq: number;
  /** per team: time left before the automatic switch may take over again */
  switchLockMs: [number, number];
  /** false on an online guest: its copy only predicts, so it never scores a goal
   * or ends the match by itself and shows no labels until the host confirms them */
  authoritative: boolean;
}

/** Keys that act on a press (or, for the shot, on a release). A quick tap can
 * start and end between two ticks, so presses are remembered until a tick has seen them. */
export const TAP_KEYS = ['pass', 'shoot', 'trick', 'switch'] as const;
export type TapKey = (typeof TAP_KEYS)[number];
export type Taps = Partial<Record<TapKey, boolean>>;

/** `input`, with every key that was pressed since the last tick counted as held for this one. */
export function withTaps(input: StreetInput, taps: Taps): StreetInput {
  const out = { ...input };
  for (const key of TAP_KEYS) if (taps[key]) out[key] = true;
  return out;
}

export function emptyStreetInput(): StreetInput {
  return { left: false, right: false, up: false, down: false, pass: false, shoot: false, trick: false, switch: false, manualSwitch: false, sprint: false };
}

const HOME: Array<[number, number]> = [
  [150, 240],
  [290, 120],
  [290, 360],
];

function homeOf(team: 0 | 1, role: number): [number, number] {
  const [x, y] = HOME[role];
  return team === 0 ? [x, y] : [COURT.w - x, y];
}

function newPlayer(team: 0 | 1, role: 0 | 1 | 2): StreetPlayer {
  const [x, y] = homeOf(team, role);
  return {
    x, y, vx: 0, vy: 0, team, role,
    fx: team === 0 ? 1 : -1, fy: 0,
    trickMs: 0, trickCd: 0, pickupCd: 0, tackleMs: 0, tackleLockMs: 0, stunMs: 0, canoDone: false, aiMs: 0,
    trickKind: 'gambeta', stamina: 1, sprinting: false, slideMs: 0, slideCd: 0, slideDx: 1, slideDy: 0, slideDone: false,
    skills: { speed: 3, dribble: 3, shot: 3, pass: 3 },
    kick: null,
  };
}

export function createStreetState(
  difficulty: Difficulty,
  targetGoals: number,
  clockMs: number,
  /** true: one human, on team 0. false: nobody. Or say it per team. */
  humans: boolean | [boolean, boolean] = true,
  /** false: el partido arranca de una, sin la animación de inicio (simulaciones y pruebas) */
  withIntro = true,
  /** estadísticas de los jugadores de cada equipo, en orden (si no se pasan, todos son normales) */
  skills?: [Stats[], Stats[]]
): StreetState {
  const teams: [boolean, boolean] = Array.isArray(humans) ? humans : [humans, false];
  const players = [newPlayer(0, 0), newPlayer(0, 1), newPlayer(0, 2), newPlayer(1, 0), newPlayer(1, 1), newPlayer(1, 2)];
  if (skills) players.forEach((p, i) => (p.skills = { ...(skills[i < 3 ? 0 : 1][i % 3] ?? p.skills) }));
  return {
    players,
    ball: { x: COURT.w / 2, y: COURT.h / 2, vx: 0, vy: 0 },
    holder: 1,
    controlled: [teams[0] ? 1 : -1, teams[1] ? 4 : -1],
    score: [0, 0],
    clockMs,
    phase: withIntro ? 'intro' : 'playing',
    phaseMs: withIntro ? STREET.intro.matchMs : 0,
    introKind: 'match',
    introTotalMs: STREET.intro.matchMs,
    lastScorer: null,
    winner: null,
    difficulty,
    humans: teams,
    targetGoals,
    prev: [emptyStreetInput(), emptyStreetInput()],
    seed: (Math.random() * 2 ** 31) | 0,
    style: [0, 0],
    crackMs: [0, 0],
    popups: [],
    chargeMs: [0, 0],
    popupSeq: 0,
    switchLockMs: [0, 0],
    authoritative: true,
  };
}

function rand(s: StreetState): number {
  s.seed = (s.seed + 0x6d2b79f5) | 0;
  let t = Math.imul(s.seed ^ (s.seed >>> 15), 1 | s.seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

function unit(x: number, y: number, fallbackX = 1, fallbackY = 0): [number, number] {
  const m = Math.hypot(x, y);
  return m < 1e-6 ? [fallbackX, fallbackY] : [x / m, y / m];
}

interface Intent {
  dx: number;
  dy: number;
  pass: boolean;
  shoot: boolean;
  trick: boolean;
  /** tirarse a barrer (sin la pelota) */
  slide: boolean;
  sprint: boolean;
}

function popup(s: StreetState, team: 0 | 1, text: string, x: number, y: number): void {
  if (!s.authoritative) return;
  // stack on top of any label still showing nearby instead of overlapping it
  let top = y - PLAYER_R - 14;
  while (s.popups.some((q) => Math.abs(q.x - x) < 90 && Math.abs(q.y - top) < 20)) top -= 22;
  s.popupSeq += 1;
  s.popups.push({ id: s.popupSeq, text, x, y: top, ms: STREET.popupMs, team });
}

/** Adds style to a team; a full meter starts "Modo Crack" for that team. */
function addStyle(s: StreetState, team: 0 | 1, amount: number): void {
  if (s.crackMs[team] > 0) return;
  s.style[team] = Math.max(0, Math.min(100, s.style[team] + amount));
  if (s.style[team] >= 100) {
    s.style[team] = 0;
    s.crackMs[team] = STREET.crack.durationMs;
    popup(s, team, '¡MODO CRACK!', COURT.w / 2, COURT.h / 2);
  }
}

function goalX(team: 0 | 1): number {
  return team === 0 ? COURT.w : 0;
}

/** The team that conceded (or team 0 at the start) takes the ball from the centre. */
function kickoff(s: StreetState, kickingTeam: 0 | 1): void {
  s.players.forEach((p) => {
    const [x, y] = homeOf(p.team, p.role);
    Object.assign(p, { x, y, vx: 0, vy: 0, trickMs: 0, tackleMs: 0, tackleLockMs: 0, pickupCd: 0, stunMs: 0, canoDone: false, kick: null, slideMs: 0, sprinting: false, stamina: Math.max(p.stamina, 0.6) });
    p.fx = p.team === 0 ? 1 : -1;
    p.fy = 0;
  });
  s.ball = { x: COURT.w / 2, y: COURT.h / 2, vx: 0, vy: 0 };
  const taker = kickingTeam * 3 + 1;
  const tp = s.players[taker];
  tp.x = COURT.w / 2 + (kickingTeam === 0 ? -PLAYER_R : PLAYER_R);
  tp.y = COURT.h / 2;
  s.holder = taker;
}

function kick(s: StreetState, i: number, dx: number, dy: number, power: number): void {
  const p = s.players[i];
  const [ux, uy] = unit(dx, dy, p.fx, p.fy);
  s.ball.x = p.x + ux * (PLAYER_R + BALL_R + 2);
  s.ball.y = p.y + uy * (PLAYER_R + BALL_R + 2);
  s.ball.vx = ux * power;
  s.ball.vy = uy * power;
  s.holder = -1;
  p.pickupCd = STREET.kickPickupCdMs;
  p.fx = ux;
  p.fy = uy;
}

/** Best teammate to pass to, given the direction the player is aiming. */
function pickPassTarget(s: StreetState, i: number, aimX: number, aimY: number): number {
  const p = s.players[i];
  let best = -1;
  let bestScore = -Infinity;
  s.players.forEach((m, j) => {
    if (j === i || m.team !== p.team) return;
    const [ux, uy] = unit(m.x - p.x, m.y - p.y);
    const d = dist(p.x, p.y, m.x, m.y);
    const score = (ux * aimX + uy * aimY) * 200 - d * 0.15;
    if (score > bestScore) {
      bestScore = score;
      best = j;
    }
  });
  return best;
}

const statFactor = (points: number, perPoint: number): number => 1 + (points - 3) * perPoint;

function doPass(s: StreetState, i: number, aimX: number, aimY: number): void {
  const p = s.players[i];
  const j = pickPassTarget(s, i, aimX, aimY);
  if (j < 0) return;
  const m = s.players[j];
  const lead = 0.25;
  const tx = m.x + m.vx * lead;
  const ty = m.y + m.vy * lead;
  const d = dist(p.x, p.y, tx, ty);
  const power = Math.min(STREET.passPowerMax, Math.max(STREET.passPowerMin, d * 1.6 + 200)) * statFactor(p.skills.pass, STREET.stats.passPerPoint);
  kick(s, i, tx - p.x, ty - p.y, power);
  if (s.humans[p.team]) s.controlled[p.team] = j;
}

function doShoot(s: StreetState, i: number, aimDy: number, aimError: number, power = 1): void {
  const p = s.players[i];
  const gx = goalX(p.team);
  const mid = (COURT.goalTop + COURT.goalBottom) / 2;
  const crack = s.crackMs[p.team] > 0;
  const ty = mid + aimDy * 55 + (crack ? 0 : (rand(s) - 0.5) * aimError);
  kick(s, i, gx - p.x, ty - p.y, STREET.shotPower * power * statFactor(p.skills.shot, STREET.stats.shotPerPoint) * (crack ? STREET.crack.shotBoost : 1));
}

function aiIntent(s: StreetState, i: number): Intent {
  const cfg = STREET.difficulty[s.difficulty];
  const p = s.players[i];
  const atk = p.team === 0 ? 1 : -1;
  const gx = goalX(p.team);
  const intent: Intent = { dx: 0, dy: 0, pass: false, shoot: false, trick: false, slide: false, sprint: false };
  const opponents = s.players.filter((o) => o.team !== p.team);
  const decide = p.aiMs <= 0;
  if (decide) p.aiMs = cfg.decisionMs * (0.7 + rand(s) * 0.6);

  if (s.holder === i) {
    let tx = gx;
    let ty = COURT.h / 2;
    const near = opponents
      .filter((o) => (o.x - p.x) * atk > -10 && dist(o.x, o.y, p.x, p.y) < 80)
      .sort((a, b) => dist(a.x, a.y, p.x, p.y) - dist(b.x, b.y, p.x, p.y))[0];
    if (near) ty = p.y + (p.y >= near.y ? 90 : -90);
    [intent.dx, intent.dy] = unit(tx - p.x, ty - p.y);
    // en plena cola de vaca sigue saliendo para donde arrancó
    if (p.trickMs > 0 && p.trickKind === 'cola') {
      [intent.dx, intent.dy] = unit(p.vx, p.vy, p.fx, p.fy);
      return intent;
    }
    // campo libre adelante: a fondo
    intent.sprint = !near && p.stamina > STREET.sprint.cpuMin;
    const inRange = Math.abs(gx - p.x) < cfg.shootRange;
    const front = near && (near.x - p.x) * p.fx + (near.y - p.y) * p.fy > 0;
    if (decide && inRange) intent.shoot = true;
    else if (decide && near && front && p.trickCd <= 0 && dist(near.x, near.y, p.x, p.y) < 40 && rand(s) < 0.3) {
      // cola de vaca: lo encara, la pisa y sale para atrás y al costado
      const side = p.y > COURT.h / 2 ? -1 : 1;
      [intent.dx, intent.dy] = unit(-p.fx - p.fy * side * 0.6, -p.fy + p.fx * side * 0.6);
      intent.trick = true;
    } else if (near && p.trickCd <= 0 && dist(near.x, near.y, p.x, p.y) < 34 && rand(s) < 0.04) {
      // go straight at the rival: a gambeta now is a caño
      [intent.dx, intent.dy] = unit(near.x - p.x, near.y - p.y);
      intent.trick = true;
    } else if (decide && near && dist(near.x, near.y, p.x, p.y) < 42) {
      if (p.trickCd <= 0 && rand(s) < 0.6) intent.trick = true;
      else intent.pass = true;
    }
    return intent;
  }

  const holderP = s.holder >= 0 ? s.players[s.holder] : null;
  let tx: number;
  let ty: number;
  if (holderP && holderP.team === p.team) {
    tx = holderP.x + atk * (60 + p.role * 45);
    ty = p.role === 1 ? holderP.y - 110 : p.role === 2 ? holderP.y + 110 : holderP.y;
    if (p.role === 0) tx = holderP.x - atk * 90;
  } else {
    // the last man guards the goal: he only comes out for a loose ball that is close to it
    const ownGoalX = p.team === 0 ? 0 : COURT.w;
    const looseNearGoal = !holderP && Math.abs(s.ball.x - ownGoalX) < STREET.keeper.comeOutPx;
    const mates = s.players.filter(
      (m) => m.team === p.team && s.players.indexOf(m) !== s.controlled[m.team] && (m.role !== 0 || looseNearGoal)
    );
    const chaser = mates.sort((a, b) => dist(a.x, a.y, s.ball.x, s.ball.y) - dist(b.x, b.y, s.ball.x, s.ball.y))[0];
    if (p.role === 0 && chaser !== p) {
      tx = ownGoalX + atk * STREET.keeper.linePx;
      ty = Math.max(COURT.goalTop + 6, Math.min(COURT.goalBottom - 6, s.ball.y));
    } else if (chaser === p) {
      const target = holderP ?? s.ball;
      tx = target.x;
      ty = target.y;
    } else {
      const [hx, hy] = homeOf(p.team, p.role);
      tx = hx + (s.ball.x - hx) * 0.3;
      ty = hy + (s.ball.y - hy) * 0.25;
    }
  }
  tx = Math.max(PLAYER_R, Math.min(COURT.w - PLAYER_R, tx));
  ty = Math.max(PLAYER_R, Math.min(COURT.h - PLAYER_R, ty));
  const d = dist(p.x, p.y, tx, ty);
  if (d > 10) [intent.dx, intent.dy] = unit(tx - p.x, ty - p.y);
  // lejos de donde tiene que estar: sprint
  intent.sprint = d > 130 && p.stamina > STREET.sprint.cpuMin;
  // barrida: el rival que lleva la pelota viene cerca y de frente (de atrás sería falta)
  if (decide && holderP && holderP.team !== p.team && p.slideCd <= 0) {
    const dh = dist(p.x, p.y, holderP.x, holderP.y);
    const [ux, uy] = unit(holderP.x - p.x, holderP.y - p.y);
    const headOn = ux * holderP.fx + uy * holderP.fy < 0;
    if (dh > 26 && dh < 62 && headOn && holderP.trickMs <= 0 && rand(s) < cfg.slideChance) {
      intent.slide = true;
      [intent.dx, intent.dy] = [ux, uy];
    }
  }
  // a loose ball that is right at the feet: take a swing at goal
  if (!holderP && decide && dist(p.x, p.y, s.ball.x, s.ball.y) < 26 && Math.abs(gx - p.x) < cfg.shootRange) intent.shoot = true;
  return intent;
}

function humanIntent(input: StreetInput, prev: StreetInput): Intent {
  return {
    dx: (input.right ? 1 : 0) - (input.left ? 1 : 0),
    dy: (input.down ? 1 : 0) - (input.up ? 1 : 0),
    pass: input.pass && !prev.pass,
    // the shot loads while the key is held and goes off on release
    shoot: !input.shoot && prev.shoot,
    trick: input.trick && !prev.trick,
    // sin la pelota, apretar K es barrida (se decide en stepStreet, que sabe quién la tiene)
    slide: input.shoot && !prev.shoot,
    sprint: input.sprint,
  };
}

/** The switch key: hand control to the teammate closest to the ball. Does
 * nothing while your team has the ball, since you already play whoever has it. */
function switchPlayer(s: StreetState, team: 0 | 1): void {
  if (s.holder >= 0 && s.players[s.holder].team === team) return;
  let best = -1;
  let bestD = Infinity;
  for (let j = team * 3; j < team * 3 + 3; j++) {
    if (j === s.controlled[team]) continue;
    const d = dist(s.players[j].x, s.players[j].y, s.ball.x, s.ball.y);
    if (d < bestD) {
      bestD = d;
      best = j;
    }
  }
  if (best < 0) return;
  s.controlled[team] = best;
  s.switchLockMs[team] = STREET.switchLockMs;
}

/** Each human plays whoever has the ball on their team, or else (unless they
 * switch by hand only) whoever is closest to it. */
function updateControlled(s: StreetState, inputs: [StreetInput, StreetInput], dtMs: number): void {
  for (const team of [0, 1] as const) {
    if (!s.humans[team]) {
      s.controlled[team] = -1;
      continue;
    }
    s.switchLockMs[team] = Math.max(0, s.switchLockMs[team] - dtMs);
    if (inputs[team].switch && !s.prev[team].switch) switchPlayer(s, team);
    if (s.holder >= 0 && s.players[s.holder].team === team) {
      s.controlled[team] = s.holder;
      continue;
    }
    if (s.controlled[team] >= 0 && (inputs[team].manualSwitch || s.switchLockMs[team] > 0)) continue;
    let best = s.controlled[team] >= 0 ? s.controlled[team] : team * 3 + 1;
    let bestD = dist(s.players[best].x, s.players[best].y, s.ball.x, s.ball.y) - STREET.switchHysteresisPx;
    for (let j = team * 3; j < team * 3 + 3; j++) {
      const d = dist(s.players[j].x, s.players[j].y, s.ball.x, s.ball.y);
      // the last man keeps guarding the goal on his own unless the ball is right on him
      if (s.players[j].role === 0 && j !== best && d > STREET.keeper.comeOutPx) continue;
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    }
    s.controlled[team] = best;
  }
}

function endIfOver(s: StreetState): void {
  const [a, b] = s.score;
  // level when the clock runs out: play on, next goal wins (gol de oro)
  if (a >= s.targetGoals || b >= s.targetGoals || (s.clockMs <= 0 && a !== b)) {
    s.phase = 'ended';
    s.winner = a === b ? 'draw' : a > b ? 0 : 1;
  }
}

/**
 * La barrida de `i` llega a la pelota. Al que la lleva se la saca y lo deja en
 * el piso, salvo que esté gambeteando (la esquiva) o que la barrida venga de
 * atrás (falta: se queda con la pelota). Una pelota suelta, la desvía.
 */
function slideContact(s: StreetState, i: number): void {
  const p = s.players[i];
  const sl = STREET.slide;
  // los pies van adelante
  const footX = p.x + p.slideDx * PLAYER_R;
  const footY = p.y + p.slideDy * PLAYER_R;
  if (dist(footX, footY, s.ball.x, s.ball.y) > sl.reachPx + BALL_R) return;
  if (s.holder >= 0) {
    const h = s.players[s.holder];
    if (h.team === p.team || h.trickMs > 0) return;
    p.slideDone = true;
    if (p.slideDx * h.fx + p.slideDy * h.fy > -sl.fromBehindDot) {
      popup(s, h.team, '¡Falta!', h.x, h.y);
      return;
    }
    h.stunMs = sl.victimStunMs;
    h.pickupCd = STREET.tackledPickupCdMs;
    h.tackleLockMs = STREET.tackleLockMs;
    h.kick = null;
    addStyle(s, h.team, -STREET.style.robbed);
    addStyle(s, p.team, sl.style);
    popup(s, p.team, '¡Barrida!', h.x, h.y);
  } else {
    p.slideDone = true;
  }
  s.holder = -1;
  s.ball.vx = p.slideDx * sl.pokePower + p.vx * 0.2;
  s.ball.vy = p.slideDy * sl.pokePower + p.vy * 0.2;
  s.players.forEach((q) => (q.tackleMs = 0));
}

/** Salta la animación de inicio: el partido empieza en el próximo paso. */
export function skipStreetIntro(s: StreetState): void {
  if (s.phase === 'intro') s.phaseMs = 0;
}

/** `input` is team 0's human, or one input per team when both sides are played by people. */
export function stepStreet(s: StreetState, input: StreetInput | [StreetInput, StreetInput], dtMs: number): void {
  if (s.phase === 'ended') return;
  const inputs: [StreetInput, StreetInput] = Array.isArray(input) ? input : [input, emptyStreetInput()];
  const dt = dtMs / 1000;

  if (s.phase === 'goal') {
    s.phaseMs -= dtMs;
    if (s.phaseMs <= 0) {
      const over = s.score[0] >= s.targetGoals || s.score[1] >= s.targetGoals || (s.clockMs <= 0 && s.score[0] !== s.score[1]);
      if (over) {
        if (s.authoritative) endIfOver(s);
      } else {
        kickoff(s, s.lastScorer === 0 ? 1 : 0);
        // después de cada gol, la versión corta de la animación de inicio
        s.phase = 'intro';
        s.introKind = 'restart';
        s.introTotalMs = STREET.intro.restartMs;
        s.phaseMs = STREET.intro.restartMs;
      }
    }
    return;
  }

  if (s.phase === 'intro') {
    // durante la intro no corre el reloj ni responden los controles
    s.phaseMs -= dtMs;
    s.popups = s.popups.filter((q) => (q.ms -= dtMs) > 0);
    s.chargeMs = [0, 0];
    // lo que se mantenga apretado al arrancar no dispara nada: el tiro cargado empieza de cero
    s.prev = [
      { ...inputs[0], shoot: false },
      { ...inputs[1], shoot: false },
    ];
    if (s.phaseMs <= 0) {
      s.phase = 'playing';
      s.phaseMs = 0;
    }
    return;
  }

  s.clockMs = Math.max(0, s.clockMs - dtMs);
  s.crackMs = [Math.max(0, s.crackMs[0] - dtMs), Math.max(0, s.crackMs[1] - dtMs)];
  s.popups = s.popups.filter((q) => (q.ms -= dtMs) > 0);
  updateControlled(s, inputs, dtMs);
  const cfg = STREET.difficulty[s.difficulty];
  const c = STREET.charge;
  const chargePower = s.chargeMs.map((ms) => c.minPower + (c.maxPower - c.minPower) * Math.min(1, ms / c.maxMs));
  s.chargeMs = [inputs[0].shoot ? s.chargeMs[0] + dtMs : 0, inputs[1].shoot ? s.chargeMs[1] + dtMs : 0];

  // --- decisions and movement
  s.players.forEach((p, i) => {
    p.aiMs -= dtMs;
    p.trickMs = Math.max(0, p.trickMs - dtMs);
    p.trickCd = Math.max(0, p.trickCd - dtMs);
    p.pickupCd = Math.max(0, p.pickupCd - dtMs);
    p.tackleLockMs = Math.max(0, p.tackleLockMs - dtMs);
    p.stunMs = Math.max(0, p.stunMs - dtMs);
    p.slideCd = Math.max(0, p.slideCd - dtMs);
    p.slideMs = Math.max(0, p.slideMs - dtMs);

    const human = i === s.controlled[p.team];
    const intent = human ? humanIntent(inputs[p.team], s.prev[p.team]) : aiIntent(s, i);
    // en el piso (caño o barrida) no se decide nada
    if (p.stunMs > 0 || p.slideMs > 0) Object.assign(intent, { dx: 0, dy: 0, pass: false, shoot: false, trick: false, slide: false, sprint: false });
    const aimError = human ? STREET.humanAimError : cfg.aimErr;

    const [mx, my] = unit(intent.dx, intent.dy, 0, 0);
    const moving = mx !== 0 || my !== 0;
    // cola de vaca: la gambeta pedida hacia atrás de donde mira (se mide antes de girar)
    const backwards = moving && mx * p.fx + my * p.fy < STREET.cola.backDot;
    if (moving && p.trickMs > 0 && p.trickKind === 'cola') {
      // en la cola de vaca gira con la pelota pegada: la arrastra alrededor del cuerpo
      let diff = Math.atan2(my, mx) - Math.atan2(p.fy, p.fx);
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      const a = Math.atan2(p.fy, p.fx) + Math.max(-18 * dt, Math.min(18 * dt, diff));
      [p.fx, p.fy] = [Math.cos(a), Math.sin(a)];
    } else if (moving) {
      p.fx += (mx - p.fx) * Math.min(1, 14 * dt);
      p.fy += (my - p.fy) * Math.min(1, 14 * dt);
      [p.fx, p.fy] = unit(p.fx, p.fy);
    }

    // barrida: sin la pelota en el equipo, y sin una pelota suelta a los pies (eso es volea)
    const looseAtFeet = s.holder < 0 && dist(p.x, p.y, s.ball.x, s.ball.y) < PLAYER_R + BALL_R + 24;
    const ownBall = s.holder >= 0 && s.players[s.holder].team === p.team;
    if (intent.slide && !ownBall && !looseAtFeet && p.slideCd <= 0 && !p.kick) {
      const sl = STREET.slide;
      [p.slideDx, p.slideDy] = moving ? [mx, my] : [p.fx, p.fy];
      [p.fx, p.fy] = [p.slideDx, p.slideDy];
      p.slideMs = sl.moveMs + sl.getUpMs;
      p.slideCd = sl.cooldownMs + sl.moveMs + sl.getUpMs;
      p.slideDone = false;
      p.sprinting = false;
      // tirado no puede agarrar la pelota; se la queda un compañero o la levanta al pararse
      p.pickupCd = sl.moveMs + sl.getUpMs;
    }

    if (intent.trick && p.trickCd <= 0) {
      p.trickCd = STREET.trickCooldownMs * (1 - (p.skills.dribble - 3) * STREET.stats.trickCdPerPoint);
      const rivalClose = s.players.filter((o) => o.team !== p.team && dist(o.x, o.y, p.x, p.y) < STREET.style.rivalNearPx);
      if (s.holder === i && backwards) {
        // la pisa, la arrastra para atrás y sale para el otro lado: el que lo encaraba queda pagando
        p.trickKind = 'cola';
        p.trickMs = STREET.cola.ms;
        p.canoDone = true;
        p.vx = mx * STREET.speed * STREET.cola.boost;
        p.vy = my * STREET.speed * STREET.cola.boost;
        for (const o of rivalClose) {
          o.tackleLockMs = Math.max(o.tackleLockMs, STREET.cola.rivalLockMs);
          o.tackleMs = 0;
        }
        if (rivalClose.length) {
          addStyle(s, p.team, STREET.cola.style);
          popup(s, p.team, '¡Cola de vaca!', p.x, p.y);
        }
      } else {
        p.trickKind = 'gambeta';
        p.trickMs = STREET.trickMs;
        p.canoDone = false;
        if (s.holder === i && rivalClose.length) {
          addStyle(s, p.team, STREET.style.trickPastRival);
          popup(s, p.team, '¡Gambeta!', p.x, p.y);
        }
        if (moving) {
          p.vx = mx * STREET.speed * STREET.trickBoost;
          p.vy = my * STREET.speed * STREET.trickBoost;
        }
      }
    }

    // sprint: gasta aire; sin aire no arranca uno nuevo
    const sp = STREET.sprint;
    p.sprinting = intent.sprint && moving && !p.kick && (p.sprinting ? p.stamina > 0 : p.stamina > sp.minToStart);
    p.stamina = p.sprinting ? Math.max(0, p.stamina - dt / sp.drainS) : Math.min(1, p.stamina + dt / sp.regenS);

    if (p.slideMs > 0) {
      // barriendo: sale disparado y se va frenando; al final se levanta quieto
      const sl = STREET.slide;
      const sliding = p.slideMs - sl.getUpMs;
      const v = sliding > 0 ? STREET.speed * sl.boost * Math.min(1, sliding / sl.moveMs + 0.25) : 0;
      p.vx = p.slideDx * v;
      p.vy = p.slideDy * v;
    } else {
      const crackBoost = s.crackMs[p.team] > 0 ? STREET.crack.speedBoost : 1;
      const base = (human ? STREET.speed : STREET.speed * cfg.speed) * (s.holder === i ? STREET.carrierSlow : 1) * crackBoost * statFactor(p.skills.speed, STREET.stats.speedPerPoint);
      const burst = p.trickMs > 0 ? (p.trickKind === 'cola' ? STREET.cola.boost : STREET.trickBoost) : 1;
      const top = base * burst * (p.sprinting ? sp.boost : 1) * (p.kick && !p.kick.done ? STREET.kick.windupSlow : 1);
      p.vx += (mx * top - p.vx) * Math.min(1, STREET.accel * dt);
      p.vy += (my * top - p.vy) * Math.min(1, STREET.accel * dt);
    }
    p.x = Math.max(PLAYER_R, Math.min(COURT.w - PLAYER_R, p.x + p.vx * dt));
    p.y = Math.max(PLAYER_R, Math.min(COURT.h - PLAYER_R, p.y + p.vy * dt));

    // la barrida llega a la pelota
    if (p.slideMs > STREET.slide.getUpMs && !p.slideDone) slideContact(s, i);

    // actions
    const nearBall = s.holder < 0 && dist(p.x, p.y, s.ball.x, s.ball.y) < PLAYER_R + BALL_R + 14 && p.pickupCd <= 0;
    const startKick = (kind: KickState['kind'], params: Partial<KickState>) => {
      const contactMs = kind === 'shot' ? STREET.kick.shotWindupMs : STREET.kick.passWindupMs;
      p.kick = { kind, ms: 0, contactMs, done: false, aimX: 0, aimY: 0, aimDy: 0, aimError: 0, power: 1, ...params };
    };
    if (p.kick) {
      // un pase o tiro en curso: la pelota sale recién en el contacto
      p.kick.ms += dtMs;
      if (!p.kick.done && s.holder !== i) p.kick = null; // le quitaron la pelota en la preparación
      else if (!p.kick.done && p.kick.ms >= p.kick.contactMs) {
        p.kick.done = true;
        if (p.kick.kind === 'shot') doShoot(s, i, p.kick.aimDy, p.kick.aimError, p.kick.power);
        else doPass(s, i, p.kick.aimX, p.kick.aimY);
      }
      if (p.kick && p.kick.ms >= p.kick.contactMs + STREET.kick.followMs) p.kick = null;
    } else if (s.holder === i || nearBall) {
      if (intent.shoot) {
        // the CPU aims for the side of the goal the rival's last man has left open
        const guard = s.players.find((o) => o.team !== p.team && o.role === 0);
        const mid = (COURT.goalTop + COURT.goalBottom) / 2;
        const cpuAim = guard && guard.y > mid ? -0.7 : 0.7;
        const params = { aimDy: human ? intent.dy : cpuAim, aimError, power: human ? chargePower[p.team] : 1 };
        if (s.holder === i) startKick('shot', params);
        else {
          // de volea, a una pelota suelta: no hay tiempo de preparar, el contacto es ya
          doShoot(s, i, params.aimDy, params.aimError, params.power);
          startKick('shot', { ...params, ms: STREET.kick.shotWindupMs, done: true });
        }
      } else if (intent.pass && s.holder === i) {
        const [ax, ay] = moving ? [mx, my] : [p.fx, p.fy];
        startKick('pass', { aimX: ax, aimY: ay });
      }
    }
  });

  // --- players push each other apart
  for (let a = 0; a < s.players.length; a++) {
    for (let b = a + 1; b < s.players.length; b++) {
      const pa = s.players[a];
      const pb = s.players[b];
      const d = dist(pa.x, pa.y, pb.x, pb.y);
      const min = PLAYER_R * 2 - 4;
      if (d > 0 && d < min) {
        const push = (min - d) / 2;
        const [ux, uy] = unit(pb.x - pa.x, pb.y - pa.y);
        pa.x -= ux * push;
        pa.y -= uy * push;
        pb.x += ux * push;
        pb.y += uy * push;
      }
    }
  }

  // --- ball
  const ball = s.ball;
  if (s.holder >= 0) {
    const h = s.players[s.holder];
    ball.x = h.x + h.fx * (PLAYER_R + BALL_R - 3);
    ball.y = Math.max(BALL_R, Math.min(COURT.h - BALL_R, h.y + h.fy * (PLAYER_R + BALL_R - 3)));
    ball.vx = h.vx;
    ball.vy = h.vy;

    // tackles: an opponent has to stay on the carrier for a moment
    s.players.forEach((o, j) => {
      if (o.team === h.team || s.holder < 0) return;
      const contact = dist(o.x, o.y, h.x, h.y) < PLAYER_R * 2 + 4;
      // caño: running into a rival mid-gambeta puts the ball through their legs
      if (contact && h.trickMs > 0 && !h.canoDone && o.stunMs <= 0) {
        h.canoDone = true;
        o.stunMs = STREET.style.canoStunMs;
        o.tackleMs = 0;
        addStyle(s, h.team, STREET.style.cano);
        popup(s, h.team, '¡CAÑO!', o.x, o.y);
      }
      // durante la gambeta y durante la preparación de un pase o tiro no se puede quitar: la jugada ya está jugada
      const kicking = !!h.kick && !h.kick.done;
      const touching = contact && h.trickMs <= 0 && !kicking && o.tackleLockMs <= 0 && o.stunMs <= 0 && o.slideMs <= 0;
      o.tackleMs = touching ? o.tackleMs + dtMs : Math.max(0, o.tackleMs - dtMs * 2);
      // un buen regateador es más difícil de marcar
      if (o.tackleMs >= cfg.tackleMs * Math.max(0.4, 1 + (h.skills.dribble - 3) * STREET.stats.tackleResistPerPoint)) {
        h.pickupCd = STREET.tackledPickupCdMs;
        h.tackleLockMs = STREET.tackleLockMs;
        addStyle(s, h.team, -STREET.style.robbed);
        s.holder = j;
        s.players.forEach((q) => (q.tackleMs = 0));
      }
    });
  } else {
    const friction = Math.exp(-STREET.ballFriction * dt);
    ball.vx *= friction;
    ball.vy *= friction;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    const speed = Math.hypot(ball.vx, ball.vy);

    for (const p of s.players) {
      if (dist(p.x, p.y, ball.x, ball.y) >= PLAYER_R + BALL_R + 4) continue;
      if (speed > STREET.catchMaxSpeed) {
        // a hard shot is blocked, not caught
        const [ux, uy] = unit(ball.x - p.x, ball.y - p.y);
        ball.vx = ux * speed * 0.45 + p.vx * 0.5;
        ball.vy = uy * speed * 0.45 + p.vy * 0.5;
        ball.x = p.x + ux * (PLAYER_R + BALL_R + 5);
        ball.y = p.y + uy * (PLAYER_R + BALL_R + 5);
        break;
      }
    }
    if (s.holder < 0 && speed <= STREET.catchMaxSpeed) {
      let bestJ = -1;
      let bestD = PLAYER_R + BALL_R + 4;
      s.players.forEach((p, j) => {
        const d = dist(p.x, p.y, ball.x, ball.y);
        if (p.pickupCd <= 0 && p.stunMs <= 0 && d < bestD) {
          bestD = d;
          bestJ = j;
        }
      });
      if (bestJ >= 0) {
        s.holder = bestJ;
        s.players.forEach((q) => (q.tackleMs = 0));
      }
    }

    // walls; the goal mouths are open
    const inMouth = ball.y > COURT.goalTop && ball.y < COURT.goalBottom;
    if (ball.y < BALL_R) {
      ball.y = BALL_R;
      ball.vy = Math.abs(ball.vy) * STREET.wallBounce;
    } else if (ball.y > COURT.h - BALL_R) {
      ball.y = COURT.h - BALL_R;
      ball.vy = -Math.abs(ball.vy) * STREET.wallBounce;
    }
    if (!inMouth) {
      if (ball.x < BALL_R) {
        ball.x = BALL_R;
        ball.vx = Math.abs(ball.vx) * STREET.wallBounce;
      } else if (ball.x > COURT.w - BALL_R) {
        ball.x = COURT.w - BALL_R;
        ball.vx = -Math.abs(ball.vx) * STREET.wallBounce;
      }
    }
  }

  // --- goals
  const inMouth = ball.y > COURT.goalTop && ball.y < COURT.goalBottom;
  const scoredFor: 0 | 1 | null = inMouth && ball.x > COURT.w ? 0 : inMouth && ball.x < 0 ? 1 : null;
  if (scoredFor !== null && !s.authoritative) {
    // a guest's prediction never scores: the ball waits in the net until the host's snapshot says goal
    ball.vx = 0;
    ball.vy = 0;
  } else if (scoredFor !== null) {
    const crackGoal = s.crackMs[scoredFor] > 0;
    s.score[scoredFor] += crackGoal ? STREET.crack.goalValue : 1;
    if (crackGoal) popup(s, scoredFor, `¡GOL CRACK! x${STREET.crack.goalValue}`, COURT.w / 2, COURT.h / 2 - 40);
    else addStyle(s, scoredFor, STREET.style.goal);
    s.lastScorer = scoredFor;
    s.phase = 'goal';
    s.phaseMs = STREET.goalPauseMs;
    s.holder = -1;
    ball.vx = 0;
    ball.vy = 0;
  } else if (s.clockMs <= 0 && s.authoritative) {
    endIfOver(s);
  }

  s.prev = [{ ...inputs[0] }, { ...inputs[1] }];
}
