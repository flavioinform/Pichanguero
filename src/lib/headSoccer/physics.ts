import type { Ball, GameState, Input, MatchConfig, PlayerBody } from './types';

export const FIELD_WIDTH = 800;
export const FIELD_HEIGHT = 450;
export const GROUND_Y = 400;
export const GOAL_HEIGHT = 130;

const GRAVITY_PLAYER = 2200;
const GRAVITY_BALL = 1500;
const JUMP_VELOCITY = 750;
const MOVE_SPEED = 320;
const WALL_BOUNCE_DAMPING = 0.7;
const GROUND_BOUNCE_DAMPING = 0.72;
const MIN_BOUNCE_SPEED = 60;
const HEAD_BOUNCE_SPEED = 480;
const KICK_RANGE = 72;
const KICK_POWER = 900;
const KICK_COOLDOWN_MS = 350;
const KICK_UPWARD_RATIO = 0.55;
const GOAL_PAUSE_MS = 1200;

export const DEFAULT_MATCH_CONFIG: MatchConfig = {
  durationMs: 90_000,
  goalsToWin: 5,
};

function freshBall(): Ball {
  return { x: FIELD_WIDTH / 2, y: FIELD_HEIGHT / 2 - 60, vx: 0, vy: 0, radius: 16 };
}

function freshPlayer(side: 'left' | 'right'): PlayerBody {
  const headRadius = 34;
  const bodyWidth = 38;
  const bodyHeight = 56;
  const x = side === 'left' ? FIELD_WIDTH * 0.25 : FIELD_WIDTH * 0.75;
  return {
    x,
    y: GROUND_Y - bodyHeight - headRadius,
    vx: 0,
    vy: 0,
    grounded: true,
    facing: side === 'left' ? 1 : -1,
    headRadius,
    bodyWidth,
    bodyHeight,
    kickCooldownMs: 0,
  };
}

export function createInitialGameState(config: MatchConfig = DEFAULT_MATCH_CONFIG): GameState {
  return {
    ball: freshBall(),
    players: [freshPlayer('left'), freshPlayer('right')],
    scoreP1: 0,
    scoreP2: 0,
    clockMs: config.durationMs,
    phase: 'playing',
    lastGoalBy: null,
    winner: null,
    goalPauseRemainingMs: 0,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function updatePlayer(p: PlayerBody, input: Input, dtSec: number): PlayerBody {
  const next: PlayerBody = { ...p };

  if (input.left && !input.right) {
    next.vx = -MOVE_SPEED;
    next.facing = -1;
  } else if (input.right && !input.left) {
    next.vx = MOVE_SPEED;
    next.facing = 1;
  } else {
    next.vx = 0;
  }
  next.x = clamp(next.x + next.vx * dtSec, next.headRadius, FIELD_WIDTH - next.headRadius);

  if (input.jump && next.grounded) {
    next.vy = -JUMP_VELOCITY;
    next.grounded = false;
  }

  next.vy += GRAVITY_PLAYER * dtSec;
  next.y += next.vy * dtSec;

  const restY = GROUND_Y - next.bodyHeight - next.headRadius;
  if (next.y >= restY) {
    next.y = restY;
    next.vy = 0;
    next.grounded = true;
  }

  next.kickCooldownMs = Math.max(0, next.kickCooldownMs - dtSec * 1000);

  return next;
}

function updateBall(ball: Ball, dtSec: number): Ball {
  const next: Ball = { ...ball };

  next.vy += GRAVITY_BALL * dtSec;
  next.x += next.vx * dtSec;
  next.y += next.vy * dtSec;

  const groundY = GROUND_Y - next.radius;
  if (next.y >= groundY) {
    next.y = groundY;
    next.vy = Math.abs(next.vy) > MIN_BOUNCE_SPEED ? -next.vy * GROUND_BOUNCE_DAMPING : 0;
  }

  if (next.y <= next.radius) {
    next.y = next.radius;
    next.vy = Math.abs(next.vy) * GROUND_BOUNCE_DAMPING;
  }

  const inGoalMouth = next.y + next.radius > GROUND_Y - GOAL_HEIGHT;

  if (next.x - next.radius < 0 && !inGoalMouth) {
    next.x = next.radius;
    next.vx = Math.abs(next.vx) * WALL_BOUNCE_DAMPING;
  }
  if (next.x + next.radius > FIELD_WIDTH && !inGoalMouth) {
    next.x = FIELD_WIDTH - next.radius;
    next.vx = -Math.abs(next.vx) * WALL_BOUNCE_DAMPING;
  }

  return next;
}

/** Circle-circle collision between a player's head and the ball — pushes the
 * ball out along the contact normal and gives it a pop plus a share of the
 * player's horizontal momentum, so running into the ball feels responsive
 * even without pressing kick. */
function resolveHeadCollision(ball: Ball, p: PlayerBody): Ball {
  const dx = ball.x - p.x;
  const dy = ball.y - p.y;
  const dist = Math.hypot(dx, dy) || 0.001;
  const minDist = ball.radius + p.headRadius;
  if (dist >= minDist) return ball;

  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = minDist - dist;

  return {
    ...ball,
    x: ball.x + nx * overlap,
    y: ball.y + ny * overlap,
    vx: nx * HEAD_BOUNCE_SPEED + p.vx * 0.4,
    vy: ny * HEAD_BOUNCE_SPEED,
  };
}

function applyKick(ball: Ball, p: PlayerBody, input: Input): { ball: Ball; kicked: boolean } {
  if (!input.kick || p.kickCooldownMs > 0) return { ball, kicked: false };

  const dx = ball.x - p.x;
  const dy = ball.y - p.y;
  const dist = Math.hypot(dx, dy);
  if (dist > KICK_RANGE) return { ball, kicked: false };

  const dirX = p.facing;
  const dirY = -KICK_UPWARD_RATIO;
  const mag = Math.hypot(dirX, dirY);

  return {
    ball: { ...ball, vx: (dirX / mag) * KICK_POWER, vy: (dirY / mag) * KICK_POWER },
    kicked: true,
  };
}

function checkGoal(ball: Ball): 1 | 2 | null {
  const inGoalMouth = ball.y + ball.radius > GROUND_Y - GOAL_HEIGHT;
  if (!inGoalMouth) return null;
  if (ball.x - ball.radius <= 0) return 2;
  if (ball.x + ball.radius >= FIELD_WIDTH) return 1;
  return null;
}

export function step(state: GameState, inputs: [Input, Input], dtMs: number, config: MatchConfig = DEFAULT_MATCH_CONFIG): GameState {
  if (state.phase === 'ended') return state;

  const dtSec = dtMs / 1000;

  if (state.phase === 'goal_pause') {
    const remaining = state.goalPauseRemainingMs - dtMs;
    if (remaining > 0) return { ...state, goalPauseRemainingMs: remaining };
    return {
      ...state,
      phase: 'playing',
      goalPauseRemainingMs: 0,
      ball: freshBall(),
      players: [freshPlayer('left'), freshPlayer('right')],
      lastGoalBy: null,
    };
  }

  let players = state.players.map((p, i) => updatePlayer(p, inputs[i], dtSec)) as [PlayerBody, PlayerBody];

  // Simple push-apart so the two heads can't overlap.
  const [a, b] = players;
  const dx = b.x - a.x;
  const minSep = a.headRadius + b.headRadius;
  if (Math.abs(dx) < minSep) {
    const push = (minSep - Math.abs(dx)) / 2;
    const dir = dx >= 0 ? 1 : -1;
    players = [
      { ...a, x: clamp(a.x - push * dir, a.headRadius, FIELD_WIDTH - a.headRadius) },
      { ...b, x: clamp(b.x + push * dir, b.headRadius, FIELD_WIDTH - b.headRadius) },
    ];
  }

  let ball = updateBall(state.ball, dtSec);
  // Processing player 0 before player 1 every single frame gives index 0 a
  // persistent "first mover" edge on every contested ball — negligible on
  // any one frame, but it compounds over thousands of frames into a real,
  // fully deterministic bias (confirmed via a CPU-vs-CPU simulation: a
  // symmetric matchup always ended 5-0 for player 1). Alternating who goes
  // first by tick parity cancels that out while staying deterministic.
  const order = Math.floor(state.clockMs / 2) % 2 === 0 ? [0, 1] : [1, 0];
  for (const i of order) {
    const before = ball;
    ball = resolveHeadCollision(ball, players[i]);
    if (ball !== before) continue; // already bounced off this player, skip kick same frame
    const kickResult = applyKick(ball, players[i], inputs[i]);
    ball = kickResult.ball;
    if (kickResult.kicked) players[i] = { ...players[i], kickCooldownMs: KICK_COOLDOWN_MS };
  }

  const clockMs = Math.max(0, state.clockMs - dtMs);
  const scorer = checkGoal(ball);

  let scoreP1 = state.scoreP1;
  let scoreP2 = state.scoreP2;
  let phase: GameState['phase'] = state.phase;
  let lastGoalBy = state.lastGoalBy;
  let goalPauseRemainingMs = state.goalPauseRemainingMs;
  let winner: GameState['winner'] = null;

  if (scorer) {
    if (scorer === 1) scoreP1 += 1;
    else scoreP2 += 1;
    lastGoalBy = scorer;

    // Clock already at 0 before this goal landed means we were in sudden
    // death (see the tied-at-the-buzzer branch below) — that goal decides
    // the match outright, regardless of the goalsToWin target.
    const suddenDeath = state.clockMs <= 0;
    if (scoreP1 >= config.goalsToWin || scoreP2 >= config.goalsToWin || suddenDeath) {
      winner = scorer;
      phase = 'ended';
    } else {
      phase = 'goal_pause';
      goalPauseRemainingMs = GOAL_PAUSE_MS;
    }
  } else if (clockMs <= 0 && scoreP1 !== scoreP2) {
    winner = scoreP1 > scoreP2 ? 1 : 2;
    phase = 'ended';
  }
  // else: clock hit 0 tied with no goal this tick — stays 'playing' at a
  // frozen 0:00 clock, i.e. sudden death, until someone scores.

  return { ball, players, scoreP1, scoreP2, clockMs, phase, lastGoalBy, winner, goalPauseRemainingMs };
}
