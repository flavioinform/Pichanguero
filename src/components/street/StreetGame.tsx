import { useCallback, useEffect, useRef, useState } from 'react';
import type { MutableRefObject, PointerEvent as ReactPointerEvent } from 'react';
import { colors } from '../../theme';
import { jerseyColors } from '../../lib/countryVisuals';
import { STREET, STREET_ONLINE } from '../../config/gameConfig';
import { useViewport } from '../../hooks/useViewport';
import { COURT, TAP_KEYS, createStreetState, emptyStreetInput, stepStreet, withTaps } from '../../lib/street/engine';
import type { Difficulty, StreetInput, StreetState, TapKey, Taps } from '../../lib/street/engine';
import { ClockChip, GoalBanner, ScoreBar } from '../headsoccer/Hud';
import { HeadSoccerResult } from '../headsoccer/HeadSoccerResult';
import { drawStreet } from './render';
import type { StreetScene } from './scene3d';
import { POSITION_SLOTS, readPositions } from './scene3d';
import { mergeStreetSnapshot, type StreetSnapshot } from '../../lib/street/netSync';
import { StreetAudio } from './sound';

const STEP_MS = 1000 / 60;
const ASPECT = 16 / 9;
const MAX_FRAME_MS = 100;
/** the match runs at this fraction of normal speed for a moment when Modo Crack kicks in */
const SLOW_MO = { scale: 0.3, ms: 650 };

/** An online match: the host plays team 0 and runs the match, the guest plays team 1. */
export interface StreetOnline {
  isHost: boolean;
  /** host only: the guest's keys for the next tick */
  takeRemoteInput: () => StreetInput;
  sendInput: (input: StreetInput) => void;
  sendSnapshot: (snapshot: StreetSnapshot) => void;
  takeSnapshot: () => StreetSnapshot | null;
  connected: boolean;
}

interface StreetGameProps {
  p1CountryName: string;
  p2CountryName: string;
  difficulty: Difficulty;
  onBack: () => void;
  online?: StreetOnline;
}

interface Hud {
  clockMs: number;
  score: [number, number];
  phase: StreetState['phase'];
  winner: StreetState['winner'];
  style: [number, number];
  crackMs: [number, number];
  /** 0-1, how loaded the shot is */
  charge: number;
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
  q: 'switch',
  ' ': 'switch',
};

const MANUAL_SWITCH_KEY = 'pichanguero.street.manualSwitch';

function loadManualSwitch(): boolean {
  try {
    return localStorage.getItem(MANUAL_SWITCH_KEY) === '1';
  } catch {
    return false;
  }
}

export function StreetGame({ p1CountryName, p2CountryName, difficulty, onBack, online }: StreetGameProps) {
  const onlineRef = useRef(online);
  onlineRef.current = online;
  /** the team this screen plays */
  const myTeam: 0 | 1 = online && !online.isHost ? 1 : 0;
  const newMatch = useCallback(
    () => {
      const state = createStreetState(difficulty, STREET.targetGoals, STREET.matchSeconds * 1000, online ? [true, true] : true);
      // an online guest only predicts; the host's snapshots are the real match
      state.authoritative = !online || online.isHost;
      return state;
    },
    // an online match never changes mode half way
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [difficulty]
  );
  // a phone held sideways is wide enough to count as a tablet, so also ask whether the screen is a touch one
  const narrow = useViewport() === 'mobile';
  const [touchScreen] = useState(() => window.matchMedia?.('(pointer: coarse)').matches ?? false);
  const mobile = narrow || touchScreen;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fallbackCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<StreetInput>(emptyStreetInput());
  const touchRef = useRef<StreetInput>(emptyStreetInput());
  /** presses since the last tick, so a tap shorter than a tick still counts */
  const tapsRef = useRef<Taps>({});
  const stateRef = useRef<StreetState>(null as unknown as StreetState);
  if (!stateRef.current) stateRef.current = newMatch();
  const looksRef = useRef([jerseyColors(p1CountryName), jerseyColors(p2CountryName)] as const);
  const audioRef = useRef<StreetAudio | null>(null);
  const [hud, setHud] = useState<Hud>(() => snapshot(stateRef.current, myTeam));
  /** true when WebGL isn't available: the match is drawn flat, from above, instead */
  const [flat, setFlat] = useState(false);
  const [muted, setMuted] = useState(false);
  /** change player only with the switch key, never automatically */
  const [manualSwitch, setManualSwitch] = useState(loadManualSwitch);
  const manualSwitchRef = useRef(manualSwitch);
  manualSwitchRef.current = manualSwitch;

  const rematch = useCallback(() => {
    stateRef.current = newMatch();
    setHud(snapshot(stateRef.current, myTeam));
  }, [newMatch, myTeam]);

  useEffect(() => {
    const audio = new StreetAudio();
    audioRef.current = audio;
    function onKey(e: KeyboardEvent, value: boolean) {
      const key = KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
      if (!key) return;
      e.preventDefault();
      audio.unlock();
      if (value && (TAP_KEYS as readonly string[]).includes(key)) tapsRef.current[key as TapKey] = true;
      inputRef.current = { ...inputRef.current, [key]: value };
    }
    const down = (e: KeyboardEvent) => onKey(e, true);
    const up = (e: KeyboardEvent) => onKey(e, false);
    const unlock = () => audio.unlock();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('pointerdown', unlock);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('pointerdown', unlock);
      audio.dispose();
    };
  }, []);

  useEffect(() => {
    audioRef.current?.setMuted(muted);
  }, [muted]);

  useEffect(() => {
    try {
      localStorage.setItem(MANUAL_SWITCH_KEY, manualSwitch ? '1' : '0');
    } catch {
      // storage unavailable: the choice just won't be remembered
    }
  }, [manualSwitch]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas || !overlay) return;

    // Three.js is only downloaded when this game is opened; the match waits for it
    let scene: StreetScene | null = null;
    let ready = false;
    let cancelled = false;
    const fit = () => scene?.resize(canvas.clientWidth, canvas.clientHeight);
    import('./scene3d')
      .then(({ StreetScene: Scene }) => {
        if (cancelled) return;
        scene = new Scene(canvas, overlay, looksRef.current, myTeam);
        fit();
      })
      .catch(() => {
        if (!cancelled) setFlat(true);
      })
      .finally(() => {
        ready = true;
      });
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let lastHudKey = '';
    let slowMoMs = 0;
    // what the last frame looked like, to notice kicks, rebounds and goals as they happen
    let prevHolder = stateRef.current.holder;
    let prevVx = 0;
    let prevVy = 0;
    let prevPhase = stateRef.current.phase;
    const heard = new Set<number>();
    let tick = 0;
    let hostInput = emptyStreetInput();
    // where everything was one tick ago, so frames between ticks can be drawn in between
    let prevPositions = readPositions(stateRef.current);
    const scratch = new Float32Array(POSITION_SLOTS);

    function frame(now: number) {
      const frameMs = Math.min(MAX_FRAME_MS, now - last);
      last = now;
      if (!ready) {
        raf = requestAnimationFrame(frame);
        return;
      }
      slowMoMs = Math.max(0, slowMoMs - frameMs);
      acc += frameMs * (slowMoMs > 0 ? SLOW_MO.scale : 1);
      const net = onlineRef.current;
      const audio = audioRef.current;
      const merged = mergeInputs(inputRef.current, touchRef.current, manualSwitchRef.current);

      // guest: fall back in line with the host whenever a snapshot has arrived
      if (net && !net.isHost) {
        const received = net.takeSnapshot();
        if (received) {
          const before = readPositions(stateRef.current, scratch);
          stateRef.current = mergeStreetSnapshot(stateRef.current, received.state, 1, STREET_ONLINE.ownPositionTolerancePx);
          hostInput = received.hostInput;
          const after = readPositions(stateRef.current);
          scene?.addCorrection(before, after);
          prevPositions = after;
        }
      }
      const s = stateRef.current;

      while (acc >= STEP_MS) {
        readPositions(s, prevPositions);
        const mine = withTaps(merged, tapsRef.current);
        tapsRef.current = {};
        if (!net) stepStreet(s, mine, STEP_MS);
        else if (net.isHost) {
          stepStreet(s, [mine, net.takeRemoteInput()], STEP_MS);
          tick += 1;
          if (tick % STREET_ONLINE.snapshotEveryTicks === 0 || s.phase !== prevPhase) net.sendSnapshot({ state: s, hostInput: mine });
        } else {
          // the guest predicts with its own keys and the last keys it knows the host was holding
          net.sendInput(mine);
          stepStreet(s, [hostInput, mine], STEP_MS);
        }
        acc -= STEP_MS;

        const speed = Math.hypot(s.ball.vx, s.ball.vy);
        if (prevHolder >= 0 && s.holder < 0 && speed > 250) {
          audio?.kick(Math.min(1, speed / 850));
          if (speed > 600) scene?.addShake(0.22);
        } else if (prevHolder < 0 && s.holder < 0 && speed > 120 && (prevVx * s.ball.vx < 0 || prevVy * s.ball.vy < 0)) {
          audio?.fence();
        }
        for (const q of s.popups) {
          if (heard.has(q.id)) continue;
          heard.add(q.id);
          if (q.text.includes('MODO CRACK')) {
            audio?.crack();
            // slowing one screen down would put the two players out of step
            if (!net) slowMoMs = SLOW_MO.ms;
          } else if (q.text.includes('CAÑO')) audio?.cano();
          else if (q.text.includes('Gambeta')) audio?.trick();
        }
        if (s.phase !== prevPhase) {
          if (s.phase === 'goal') audio?.goal();
          if (s.phase === 'ended') audio?.whistle();
        }
        prevHolder = s.holder;
        prevVx = s.ball.vx;
        prevVy = s.ball.vy;
        prevPhase = s.phase;
      }

      if (scene) scene.render(s, frameMs, prevPositions, Math.min(1, acc / STEP_MS));
      else {
        const ctx = fallbackCanvasRef.current?.getContext('2d');
        if (ctx) drawStreet(ctx, s, looksRef.current);
      }

      const key = [
        Math.ceil(s.clockMs / 1000),
        s.score[0],
        s.score[1],
        s.phase,
        Math.round(s.style[0]),
        Math.round(s.style[1]),
        Math.ceil(s.crackMs[0] / 500),
        Math.ceil(s.crackMs[1] / 500),
        Math.round(Math.min(1, s.chargeMs[myTeam] / STREET.charge.maxMs) * 20),
      ].join('|');
      if (key !== lastHudKey) {
        lastHudKey = key;
        setHud(snapshot(s, myTeam));
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      scene?.dispose();
    };
    // the loop reads everything else through refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const seconds = Math.ceil(hud.clockMs / 1000);
  const goldenGoal = hud.clockMs <= 0 && hud.phase !== 'ended';
  const clockLabel = goldenGoal ? 'Gol de oro' : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
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
      <style>{`@keyframes street-popup { 0% { opacity: 0; scale: 0.4; } 18% { opacity: 1; scale: 1.2; } 30% { scale: 1; } 80% { opacity: 1; } 100% { opacity: 0; translate: 0 -26px; } }`}</style>
      <div
        style={{
          position: 'relative',
          width: `min(100%, 1180px, calc((100dvh - ${mobile ? 200 : 120}px) * ${ASPECT} + 32px))`,
          padding: '0 16px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', border: '3px solid rgba(255,255,255,0.15)' }}>
          <canvas ref={canvasRef} style={{ width: '100%', aspectRatio: `${ASPECT}`, display: flat ? 'none' : 'block' }} />
          {flat && (
            <canvas
              ref={fallbackCanvasRef}
              width={COURT.w}
              height={COURT.h}
              style={{ width: '100%', height: 'auto', aspectRatio: `${COURT.w} / ${COURT.h}`, display: 'block' }}
            />
          )}
          <div ref={overlayRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }} />
        </div>
        <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)' }}>
          <ClockChip label={clockLabel} />
        </div>
        <div style={{ position: 'absolute', top: 12, left: 28 }}>
          <StyleMeter value={hud.style[0]} crackMs={hud.crackMs[0]} color={looks[0].primary} />
        </div>
        <div style={{ position: 'absolute', top: 12, right: 28 }}>
          <StyleMeter value={hud.style[1]} crackMs={hud.crackMs[1]} color={looks[1].primary} align="right" />
        </div>
        {hud.charge > 0 && hud.phase === 'playing' && (
          <div
            style={{
              position: 'absolute',
              bottom: 58,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'min(180px, 40%)',
              height: 12,
              borderRadius: 999,
              background: 'rgba(0,0,0,0.65)',
              border: '1px solid rgba(255,255,255,0.4)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${hud.charge * 100}%`,
                height: '100%',
                background: hud.charge >= 1 ? '#ff5d3a' : 'linear-gradient(90deg, #4cd964, #ffe14a, #ff8a3a)',
              }}
            />
          </div>
        )}
        <button
          onClick={() => setManualSwitch((m) => !m)}
          title="Automático: pasás solo al compañero más cerca de la pelota. Manual: cambiás únicamente con Q o Espacio."
          style={{
            position: 'absolute',
            bottom: 12,
            right: 70,
            height: 34,
            padding: '0 12px',
            borderRadius: 999,
            background: 'rgba(10,15,12,0.75)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: '#fff',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          Cambio: {manualSwitch ? 'manual' : 'auto'}
        </button>
        <button
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? 'Activar sonido' : 'Silenciar'}
          style={{
            position: 'absolute',
            bottom: 12,
            right: 28,
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'rgba(10,15,12,0.75)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: '#fff',
            fontSize: 15,
            cursor: 'pointer',
          }}
        >
          {muted ? '🔇' : '🔊'}
        </button>
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
        {online && !online.connected && (
          <div
            style={{
              position: 'absolute',
              top: 52,
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '4px 12px',
              borderRadius: 999,
              background: 'rgba(200,60,60,0.85)',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            Reconectando…
          </div>
        )}
        {online && (
          <div
            style={{
              position: 'absolute',
              top: 44,
              [myTeam === 0 ? 'left' : 'right']: 28,
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: 1,
              color: '#ffe14a',
              textShadow: '0 1px 3px rgba(0,0,0,0.9)',
            }}
          >
            {myTeam === 0 ? 'VOS · atacás a la derecha →' : '← atacás a la izquierda · VOS'}
          </div>
        )}
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
            showRematch={!online}
          />
        )}
      </div>

      {!mobile && (
        <div style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center' }}>
          Mover: flechas o WASD · Pase: J · Tiro: K (mantené para cargar) · Gambeta: L · Cambiar jugador: Q o Espacio · Gambeteá encima de un rival para hacerle un caño
        </div>
      )}

      {hud.phase !== 'ended' && mobile && <TouchPad inputRef={touchRef} tapsRef={tapsRef} />}

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

/** Style meter; full, it turns into the Modo Crack countdown. */
function StyleMeter({ value, crackMs, color, align = 'left' }: { value: number; crackMs: number; color: string; align?: 'left' | 'right' }) {
  const crack = crackMs > 0;
  const fill = crack ? (crackMs / STREET.crack.durationMs) * 100 : value;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: align === 'right' ? 'flex-end' : 'flex-start', gap: 4 }}>
      <span
        style={{
          fontSize: 10,
          fontWeight: 900,
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: crack ? '#ffd64a' : '#fff',
          textShadow: '0 1px 3px rgba(0,0,0,0.9)',
        }}
      >
        {crack ? '¡Modo Crack!' : 'Estilo'}
      </span>
      <div
        style={{
          width: 'min(150px, 22vw)',
          height: 10,
          borderRadius: 999,
          background: 'rgba(0,0,0,0.6)',
          border: '1px solid rgba(255,255,255,0.3)',
          overflow: 'hidden',
          display: 'flex',
          justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
        }}
      >
        <div
          style={{
            width: `${fill}%`,
            height: '100%',
            background: crack ? 'linear-gradient(90deg, #ffb703, #ffe14a)' : color,
            boxShadow: crack ? '0 0 10px #ffd64a' : 'none',
            transition: 'width 0.2s',
          }}
        />
      </div>
    </div>
  );
}

function snapshot(s: StreetState, team: 0 | 1): Hud {
  return {
    clockMs: s.clockMs,
    score: [s.score[0], s.score[1]],
    phase: s.phase,
    winner: s.winner,
    style: [Math.round(s.style[0]), Math.round(s.style[1])],
    crackMs: [s.crackMs[0], s.crackMs[1]],
    charge: Math.min(1, s.chargeMs[team] / STREET.charge.maxMs),
  };
}

function mergeInputs(a: StreetInput, b: StreetInput, manualSwitch: boolean): StreetInput {
  return {
    left: a.left || b.left,
    right: a.right || b.right,
    up: a.up || b.up,
    down: a.down || b.down,
    pass: a.pass || b.pass,
    shoot: a.shoot || b.shoot,
    trick: a.trick || b.trick,
    switch: a.switch || b.switch,
    manualSwitch,
  };
}

function TouchPad({ inputRef, tapsRef }: { inputRef: MutableRefObject<StreetInput>; tapsRef: MutableRefObject<Taps> }) {
  function set(key: keyof StreetInput, value: boolean) {
    if (value && (TAP_KEYS as readonly string[]).includes(key)) tapsRef.current[key as TapKey] = true;
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
        <PadButton size={size} label="Cambio" small {...handlers('switch')} />
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
