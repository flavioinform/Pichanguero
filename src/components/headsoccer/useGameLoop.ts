import { useEffect, useRef, useState } from 'react';
import { getCpuInput } from '../../lib/headSoccer/ai';
import { createInitialGameState, DEFAULT_MATCH_CONFIG, step } from '../../lib/headSoccer/physics';
import type { GameState, Input } from '../../lib/headSoccer/types';
import { renderFrame, spawnConfetti, updateConfetti, type ConfettiParticle } from './render';
import type { HeadSoccerMode } from './types';

const STEP_MS = 1000 / 60;
// Caps how much simulated time a single frame can cover — without this, coming
// back to the tab after a while in the background would make the ball/players
// teleport through a huge catch-up burst instead of just resuming smoothly.
const MAX_FRAME_MS = 50;
/** how fast an online correction fades out */
const CORRECTION_FADE_MS = 120;
/** a jump bigger than this (the reset after a goal) is shown as is */
const CORRECTION_MAX_PX = 140;

/** ball, player 1, player 2, as [x, y] pairs */
function positions(s: GameState): number[] {
  return [s.ball.x, s.ball.y, s.players[0].x, s.players[0].y, s.players[1].x, s.players[1].y];
}

/** The state to draw: `alpha` (0-1) of the way from the previous tick to the
 * current one, plus whatever correction is still fading out. */
function drawable(prev: GameState, cur: GameState, alpha: number, offset: number[]): GameState {
  const a = positions(prev);
  const b = positions(cur);
  const at = (k: number) => {
    const between = Math.abs(b[k] - a[k]) > CORRECTION_MAX_PX ? b[k] : a[k] + (b[k] - a[k]) * alpha;
    return between + offset[k];
  };
  return {
    ...cur,
    ball: { ...cur.ball, x: at(0), y: at(1) },
    players: [
      { ...cur.players[0], x: at(2), y: at(3) },
      { ...cur.players[1], x: at(4), y: at(5) },
    ],
  };
}

export interface Hud {
  scoreP1: number;
  scoreP2: number;
  clockMs: number;
  phase: GameState['phase'];
  winner: GameState['winner'];
  justScored: boolean;
}

interface UseGameLoopOptions {
  mode: HeadSoccerMode;
  getP1Input: () => Input;
  getP2Input: () => Input;
  p1Colors: { primary: string; secondary: string };
  p2Colors: { primary: string; secondary: string };
  /** short team names shown on the scoreboard */
  labels: [string, string];
  /** online host: called after every physics tick with a running tick count */
  syncOut?: (state: GameState, tick: number) => void;
  /** online guest: returns a corrected state when a snapshot has arrived */
  syncIn?: (current: GameState) => GameState | null;
}

function initialHud(): Hud {
  return { scoreP1: 0, scoreP2: 0, clockMs: DEFAULT_MATCH_CONFIG.durationMs, phase: 'playing', winner: null, justScored: false };
}

export function useGameLoop({ mode, getP1Input, getP2Input, p1Colors, p2Colors, labels, syncOut, syncIn }: UseGameLoopOptions) {
  const syncOutRef = useRef(syncOut);
  syncOutRef.current = syncOut;
  const syncInRef = useRef(syncIn);
  syncInRef.current = syncIn;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialGameState());
  const prevStateRef = useRef<GameState>(stateRef.current);
  const confettiRef = useRef<ConfettiParticle[]>([]);
  const [hud, setHud] = useState<Hud>(initialHud());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rawCtx = canvas.getContext('2d');
    if (!rawCtx) return;
    const ctx: CanvasRenderingContext2D = rawCtx;

    let raf = 0;
    let lastTime = performance.now();
    let accumulator = 0;
    let lastHudSync = 0;
    let prevPhase: GameState['phase'] = stateRef.current.phase;
    let tick = 0;
    const offset = [0, 0, 0, 0, 0, 0];

    function frame(now: number) {
      const frameMs = Math.min(MAX_FRAME_MS, now - lastTime);
      lastTime = now;
      accumulator += frameMs;

      const fade = Math.exp(-frameMs / CORRECTION_FADE_MS);
      for (let k = 0; k < offset.length; k++) offset[k] *= fade;

      const corrected = syncInRef.current?.(stateRef.current);
      if (corrected) {
        // glide from where things were drawn to where the host says they are, instead of jumping
        const before = positions(drawable(prevStateRef.current, stateRef.current, accumulator / STEP_MS, offset));
        const after = positions(corrected);
        for (let k = 0; k < offset.length; k += 2) {
          const far = Math.hypot(before[k] - after[k], before[k + 1] - after[k + 1]) > CORRECTION_MAX_PX;
          offset[k] = far ? 0 : before[k] - after[k];
          offset[k + 1] = far ? 0 : before[k + 1] - after[k + 1];
        }
        stateRef.current = corrected;
        prevStateRef.current = corrected;
      }
      const isGuest = !!syncInRef.current;

      while (accumulator >= STEP_MS) {
        const p1Input = getP1Input();
        const p2Input = mode === 'cpu' ? getCpuInput(stateRef.current, 1) : getP2Input();
        prevStateRef.current = stateRef.current;
        stateRef.current = step(stateRef.current, [p1Input, p2Input], STEP_MS, DEFAULT_MATCH_CONFIG, !isGuest);
        accumulator -= STEP_MS;
        tick += 1;
        syncOutRef.current?.(stateRef.current, tick);

        if (stateRef.current.phase === 'goal_pause' && prevPhase !== 'goal_pause') {
          const s = stateRef.current;
          confettiRef.current = [...confettiRef.current, ...spawnConfetti(s.ball.x, s.ball.y)];
        }
        prevPhase = stateRef.current.phase;

        confettiRef.current = updateConfetti(confettiRef.current, STEP_MS);
      }

      const shown = drawable(prevStateRef.current, stateRef.current, Math.min(1, accumulator / STEP_MS), offset);
      renderFrame(ctx, shown, p1Colors, p2Colors, confettiRef.current, labels);

      if (now - lastHudSync > 100 || stateRef.current.phase === 'ended') {
        lastHudSync = now;
        const s = stateRef.current;
        setHud({
          scoreP1: s.scoreP1,
          scoreP2: s.scoreP2,
          clockMs: s.clockMs,
          phase: s.phase,
          winner: s.winner,
          justScored: s.phase === 'goal_pause',
        });
      }

      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  function resetMatch() {
    stateRef.current = createInitialGameState();
    prevStateRef.current = stateRef.current;
    confettiRef.current = [];
    setHud(initialHud());
  }

  return { canvasRef, hud, resetMatch };
}
