import { useCallback, useEffect, useRef, useState } from 'react';
import type { MutableRefObject, PointerEvent as ReactPointerEvent } from 'react';
import { colors } from '../../theme';
import { jerseyColors } from '../../lib/countryVisuals';
import { STREET } from '../../config/gameConfig';
import { useViewport } from '../../hooks/useViewport';
import { COURT, createStreetState, emptyStreetInput, stepStreet } from '../../lib/street/engine';
import type { Difficulty, StreetInput, StreetState } from '../../lib/street/engine';
import { ClockChip, GoalBanner, ScoreBar } from '../headsoccer/Hud';
import { HeadSoccerResult } from '../headsoccer/HeadSoccerResult';
import { drawStreet } from './render';

const STEP_MS = 1000 / 60;
const MAX_FRAME_MS = 100;

interface StreetGameProps {
  p1CountryName: string;
  p2CountryName: string;
  difficulty: Difficulty;
  onBack: () => void;
}

interface Hud {
  clockMs: number;
  score: [number, number];
  phase: StreetState['phase'];
  winner: StreetState['winner'];
}

const KEYS: Record<string, keyof StreetInput> = {
  ArrowLeft: 'left',
  a: 'left',
  ArrowRight: 'right',
  d: 'right',
  ArrowUp: 'up',
  w: 'up',
  ArrowDown: 'down',
  s: 'down',
  j: 'pass',
  k: 'shoot',
  l: 'trick',
};

export function StreetGame({ p1CountryName, p2CountryName, difficulty, onBack }: StreetGameProps) {
  const mobile = useViewport() === 'mobile';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<StreetInput>(emptyStreetInput());
  const touchRef = useRef<StreetInput>(emptyStreetInput());
  const stateRef = useRef<StreetState>(createStreetState(difficulty, STREET.targetGoals, STREET.matchSeconds * 1000));
  const looksRef = useRef([jerseyColors(p1CountryName), jerseyColors(p2CountryName)] as const);
  const [hud, setHud] = useState<Hud>(() => snapshot(stateRef.current));

  const rematch = useCallback(() => {
    stateRef.current = createStreetState(difficulty, STREET.targetGoals, STREET.matchSeconds * 1000);
    setHud(snapshot(stateRef.current));
  }, [difficulty]);

  useEffect(() => {
    function onKey(e: KeyboardEvent, value: boolean) {
      const key = KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
      if (!key) return;
      e.preventDefault();
      inputRef.current = { ...inputRef.current, [key]: value };
    }
    const down = (e: KeyboardEvent) => onKey(e, true);
    const up = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let lastHudKey = '';

    function frame(now: number) {
      acc += Math.min(MAX_FRAME_MS, now - last);
      last = now;
      const s = stateRef.current;
      const merged = mergeInputs(inputRef.current, touchRef.current);
      while (acc >= STEP_MS) {
        stepStreet(s, merged, STEP_MS);
        acc -= STEP_MS;
      }
      drawStreet(ctx!, s, looksRef.current);
      const key = `${Math.ceil(s.clockMs / 1000)}|${s.score[0]}|${s.score[1]}|${s.phase}`;
      if (key !== lastHudKey) {
        lastHudKey = key;
        setHud(snapshot(s));
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const seconds = Math.ceil(hud.clockMs / 1000);
  const clockLabel = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  const looks = looksRef.current;
  const winner = hud.winner === 'draw' ? 'draw' : hud.winner === 0 ? 1 : 2;

  return (
    <div
      style={{
        position: 'relative',
        zIndex: 2,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'safe center',
        overflowY: 'auto',
        gap: 12,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: `min(100%, 900px, calc((100dvh - ${mobile ? 200 : 150}px) * ${COURT.w / COURT.h} + 32px))`,
          padding: '0 16px',
          boxSizing: 'border-box',
        }}
      >
        <canvas
          ref={canvasRef}
          width={COURT.w}
          height={COURT.h}
          style={{
            width: '100%',
            height: 'auto',
            aspectRatio: `${COURT.w} / ${COURT.h}`,
            borderRadius: 14,
            border: '3px solid rgba(255,255,255,0.15)',
            display: 'block',
          }}
        />
        <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)' }}>
          <ClockChip label={clockLabel} />
        </div>
        <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)' }}>
          <ScoreBar
            p1Label={p1CountryName}
            p1Color={looks[0].primary}
            scoreP1={hud.score[0]}
            p2Label={p2CountryName}
            p2Color={looks[1].primary}
            scoreP2={hud.score[1]}
          />
        </div>
        {hud.phase === 'goal' && <GoalBanner />}
        {hud.phase === 'ended' && hud.winner !== null && (
          <HeadSoccerResult
            winner={winner}
            p1Label={p1CountryName}
            p2Label={p2CountryName}
            scoreP1={hud.score[0]}
            scoreP2={hud.score[1]}
            onRematch={rematch}
            onBack={onBack}
          />
        )}
      </div>

      {!mobile && (
        <div style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center' }}>
          Mover: flechas o WASD · Pase: J · Tiro: K · Gambeta: L
        </div>
      )}

      {hud.phase !== 'ended' && mobile && <TouchPad inputRef={touchRef} />}

      <button
        onClick={onBack}
        style={{
          padding: '8px 20px',
          background: 'none',
          border: '1px solid rgba(255,255,255,0.25)',
          color: colors.textSecondary,
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: 0.5,
          cursor: 'pointer',
          textTransform: 'uppercase',
        }}
      >
        Salir
      </button>
    </div>
  );
}

function snapshot(s: StreetState): Hud {
  return { clockMs: s.clockMs, score: [s.score[0], s.score[1]], phase: s.phase, winner: s.winner };
}

function mergeInputs(a: StreetInput, b: StreetInput): StreetInput {
  return {
    left: a.left || b.left,
    right: a.right || b.right,
    up: a.up || b.up,
    down: a.down || b.down,
    pass: a.pass || b.pass,
    shoot: a.shoot || b.shoot,
    trick: a.trick || b.trick,
  };
}

function TouchPad({ inputRef }: { inputRef: MutableRefObject<StreetInput> }) {
  function set(key: keyof StreetInput, value: boolean) {
    inputRef.current = { ...inputRef.current, [key]: value };
  }
  function handlers(key: keyof StreetInput) {
    return {
      onPointerDown: (e: ReactPointerEvent) => {
        e.preventDefault();
        set(key, true);
      },
      onPointerUp: (e: ReactPointerEvent) => {
        e.preventDefault();
        set(key, false);
      },
      onPointerLeave: () => set(key, false),
      onPointerCancel: () => set(key, false),
    };
  }
  const size = 54;
  return (
    <div style={{ display: 'flex', width: '100%', maxWidth: 900, justifyContent: 'space-between', padding: '0 16px', boxSizing: 'border-box' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(3, ${size}px)`, gridTemplateRows: `repeat(2, ${size}px)`, gap: 6 }}>
        <span />
        <PadButton size={size} label="▲" {...handlers('up')} />
        <span />
        <PadButton size={size} label="◀" {...handlers('left')} />
        <PadButton size={size} label="▼" {...handlers('down')} />
        <PadButton size={size} label="▶" {...handlers('right')} />
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <PadButton size={size} label="Pase" small {...handlers('pass')} />
        <PadButton size={size} label="Gamb." small {...handlers('trick')} />
        <PadButton size={size + 10} label="Tiro" small {...handlers('shoot')} />
      </div>
    </div>
  );
}

function PadButton({
  label,
  size,
  small,
  ...handlers
}: {
  label: string;
  size: number;
  small?: boolean;
  onPointerDown: (e: ReactPointerEvent) => void;
  onPointerUp: (e: ReactPointerEvent) => void;
  onPointerLeave: () => void;
  onPointerCancel: () => void;
}) {
  return (
    <button
      {...handlers}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'rgba(10,15,12,0.78)',
        border: '1px solid rgba(255,255,255,0.3)',
        color: '#fff',
        fontSize: small ? 12 : 20,
        fontWeight: 700,
        touchAction: 'none',
        userSelect: 'none',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}
