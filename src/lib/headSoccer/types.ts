export interface Vec2 {
  x: number;
  y: number;
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface PlayerBody {
  x: number;
  y: number;
  vx: number;
  vy: number;
  grounded: boolean;
  facing: 1 | -1;
  headRadius: number;
  bodyWidth: number;
  bodyHeight: number;
  kickCooldownMs: number;
}

export interface Input {
  left: boolean;
  right: boolean;
  jump: boolean;
  kick: boolean;
}

export type MatchPhase = 'playing' | 'goal_pause' | 'ended';

export interface GameState {
  ball: Ball;
  players: [PlayerBody, PlayerBody];
  scoreP1: number;
  scoreP2: number;
  clockMs: number;
  phase: MatchPhase;
  /** Set when a goal was just scored, so the renderer can show a flash /
   * the HUD can detect the moment without diffing scores itself. */
  lastGoalBy: 1 | 2 | null;
  /** Set once `phase` becomes 'ended'. */
  winner: 1 | 2 | 'draw' | null;
  goalPauseRemainingMs: number;
}

export interface MatchConfig {
  /** Match length in ms; clock counts down from this. */
  durationMs: number;
  goalsToWin: number;
}
