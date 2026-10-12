import { useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
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
  p1ImageRef: MutableRefObject<HTMLImageElement | null>;
  p2ImageRef: MutableRefObject<HTMLImageElement | null>;
}

function initialHud(): Hud {
  return { scoreP1: 0, scoreP2: 0, clockMs: DEFAULT_MATCH_CONFIG.durationMs, phase: 'playing', winner: null, justScored: false };
}

export function useGameLoop({ mode, getP1Input, getP2Input, p1Colors, p2Colors, p1ImageRef, p2ImageRef }: UseGameLoopOptions) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialGameState());
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

    function frame(now: number) {
      const frameMs = Math.min(MAX_FRAME_MS, now - lastTime);
      lastTime = now;
      accumulator += frameMs;

      while (accumulator >= STEP_MS) {
        const p1Input = getP1Input();
        const p2Input = mode === 'cpu' ? getCpuInput(stateRef.current, 1) : getP2Input();
        stateRef.current = step(stateRef.current, [p1Input, p2Input], STEP_MS);
        accumulator -= STEP_MS;

        if (stateRef.current.phase === 'goal_pause' && prevPhase !== 'goal_pause') {
          const s = stateRef.current;
          confettiRef.current = [...confettiRef.current, ...spawnConfetti(s.ball.x, s.ball.y)];
        }
        prevPhase = stateRef.current.phase;

        confettiRef.current = updateConfetti(confettiRef.current, STEP_MS);
      }

      renderFrame(ctx, stateRef.current, p1Colors, p2Colors, confettiRef.current, p1ImageRef.current, p2ImageRef.current);

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
    confettiRef.current = [];
    setHud(initialHud());
  }

  return { canvasRef, hud, resetMatch };
}
