import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { colors } from '../../theme';
import { jerseyColors } from '../../lib/countryVisuals';
import { fetchRandomPlayerPhoto } from '../../lib/careerData';
import { FIELD_HEIGHT, FIELD_WIDTH } from '../../lib/headSoccer/physics';
import type { Input } from '../../lib/headSoccer/types';
import { useGameLoop } from './useGameLoop';
import { ClockChip, ControlHint, GoalBanner, ScoreBar } from './Hud';
import { Controls } from './Controls';
import { HeadSoccerResult } from './HeadSoccerResult';
import type { HeadSoccerMode } from './types';

interface OnlineProps {
  /** Host is always physics-index 0 (P1), guest is always index 1 (P2) —
   * both clients must agree on this without negotiating it per-match. */
  isHost: boolean;
  remoteInputRef: MutableRefObject<Input>;
  sendInput: (input: Input) => void;
  connected: boolean;
}

interface HeadSoccerGameProps {
  mode: HeadSoccerMode;
  p1CountryName: string;
  p2CountryName: string;
  onBack: () => void;
  online?: OnlineProps;
}

function emptyInput(): Input {
  return { left: false, right: false, jump: false, kick: false };
}

function mergeInputs(...parts: Input[]): Input {
  return {
    left: parts.some((p) => p.left),
    right: parts.some((p) => p.right),
    jump: parts.some((p) => p.jump),
    kick: parts.some((p) => p.kick),
  };
}

export function HeadSoccerGame({ mode, p1CountryName, p2CountryName, onBack, online }: HeadSoccerGameProps) {
  const wasdInput = useRef<Input>(emptyInput());
  const arrowInput = useRef<Input>(emptyInput());
  const p1TouchInput = useRef<Input>(emptyInput());
  const p2TouchInput = useRef<Input>(emptyInput());

  const p1Colors = jerseyColors(p1CountryName);
  const p2Colors = jerseyColors(p2CountryName);

  const p1ImageRef = useRef<HTMLImageElement | null>(null);
  const p2ImageRef = useRef<HTMLImageElement | null>(null);

  // Real player photos (one per character, fetched once and never re-rolled
  // for this match) used as the "head" instead of a drawn cartoon face —
  // same approach as the career-mode avatar. Loaded into plain
  // HTMLImageElements so the canvas render loop can draw them directly;
  // `render.ts` falls back to the cartoon head until each one finishes
  // loading (or if the fetch comes back empty).
  useEffect(() => {
    let cancelled = false;
    fetchRandomPlayerPhoto(p1CountryName)
      .then((url) => {
        if (cancelled || !url) return;
        const img = new Image();
        img.src = url;
        p1ImageRef.current = img;
      })
      .catch(() => {});
    fetchRandomPlayerPhoto(p2CountryName)
      .then((url) => {
        if (cancelled || !url) return;
        const img = new Image();
        img.src = url;
        p2ImageRef.current = img;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Online mode: the local human always plays with WASD/touch regardless of
  // host/guest, and their input gets sent to the peer every tick; the other
  // physics slot reads from whatever last arrived over the broadcast channel.
  function getLocalOnlineInput(): Input {
    const input = mergeInputs(wasdInput.current, p1TouchInput.current, arrowInput.current);
    online?.sendInput(input);
    return input;
  }

  const getP1Input =
    mode === 'online' && online
      ? online.isHost
        ? getLocalOnlineInput
        : () => online.remoteInputRef.current
      : () => mergeInputs(wasdInput.current, p1TouchInput.current, mode === 'cpu' ? arrowInput.current : emptyInput());

  const getP2Input =
    mode === 'online' && online
      ? online.isHost
        ? () => online.remoteInputRef.current
        : getLocalOnlineInput
      : () => mergeInputs(arrowInput.current, p2TouchInput.current);

  const { canvasRef, hud, resetMatch } = useGameLoop({
    mode,
    getP1Input,
    getP2Input,
    p1Colors,
    p2Colors,
    p1ImageRef,
    p2ImageRef,
  });

  useEffect(() => {
    function setKey(ref: MutableRefObject<Input>, key: keyof Input, value: boolean) {
      ref.current = { ...ref.current, [key]: value };
    }

    function handleKey(e: KeyboardEvent, value: boolean) {
      switch (e.key) {
        case 'a':
        case 'A':
          setKey(wasdInput, 'left', value);
          break;
        case 'd':
        case 'D':
          setKey(wasdInput, 'right', value);
          break;
        case 'w':
        case 'W':
        case ' ':
          setKey(wasdInput, 'jump', value);
          if (e.key === ' ') e.preventDefault();
          break;
        case 's':
        case 'S':
        case 'k':
        case 'K':
          setKey(wasdInput, 'kick', value);
          break;
        case 'ArrowLeft':
          setKey(arrowInput, 'left', value);
          e.preventDefault();
          break;
        case 'ArrowRight':
          setKey(arrowInput, 'right', value);
          e.preventDefault();
          break;
        case 'ArrowUp':
          setKey(arrowInput, 'jump', value);
          e.preventDefault();
          break;
        case 'ArrowDown':
          setKey(arrowInput, 'kick', value);
          e.preventDefault();
          break;
        default:
          break;
      }
    }

    const onKeyDown = (e: KeyboardEvent) => handleKey(e, true);
    const onKeyUp = (e: KeyboardEvent) => handleKey(e, false);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const seconds = Math.ceil(hud.clockMs / 1000);
  const clockLabel = `${String(Math.floor(seconds / 60)).padStart(1, '0')}:${String(seconds % 60).padStart(2, '0')}`;

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
        justifyContent: 'center',
        gap: 14,
      }}
    >
      <div style={{ position: 'relative', width: '100%', maxWidth: 880, padding: '0 16px', boxSizing: 'border-box' }}>
        {/* Scales with the container while keeping the field's aspect ratio —
            the canvas' internal resolution (width/height attrs) stays fixed
            at FIELD_WIDTH/FIELD_HEIGHT so game-coordinate math never changes,
            only how big it's displayed. */}
        <canvas
          ref={canvasRef}
          width={FIELD_WIDTH}
          height={FIELD_HEIGHT}
          style={{
            width: '100%',
            height: 'auto',
            aspectRatio: `${FIELD_WIDTH} / ${FIELD_HEIGHT}`,
            borderRadius: 14,
            border: '3px solid rgba(255,255,255,0.15)',
            display: 'block',
          }}
        />

        <div style={{ position: 'absolute', top: 10, left: 26, display: 'flex', gap: 8 }}>
          {mode === 'local2p' && <ControlHint moveKeys={['A', 'D']} jumpKey="W" kickKey="S" />}
          {(mode === 'cpu' || mode === 'online') && <ControlHint moveKeys={['◀', '▶']} jumpKey="▲" kickKey="▼" />}
        </div>
        {mode === 'local2p' && (
          <div style={{ position: 'absolute', top: 10, right: 26 }}>
            <ControlHint moveKeys={['◀', '▶']} jumpKey="▲" kickKey="▼" align="right" />
          </div>
        )}

        {online && !online.connected && (
          <div
            style={{
              position: 'absolute',
              top: 44,
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

        <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)' }}>
          <ClockChip label={clockLabel} />
        </div>

        <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)' }}>
          <ScoreBar p1Label={p1CountryName} p1Color={p1Colors.primary} scoreP1={hud.scoreP1} p2Label={p2CountryName} p2Color={p2Colors.primary} scoreP2={hud.scoreP2} />
        </div>

        {hud.justScored && <GoalBanner />}

        {hud.phase === 'ended' && hud.winner && (
          <HeadSoccerResult
            winner={hud.winner}
            p1Label={p1CountryName}
            p2Label={p2CountryName}
            scoreP1={hud.scoreP1}
            scoreP2={hud.scoreP2}
            onRematch={resetMatch}
            onBack={onBack}
            showRematch={mode !== 'online'}
          />
        )}
      </div>

      {hud.phase !== 'ended' && (
        <div style={{ display: 'flex', width: '100%', maxWidth: 880, justifyContent: 'space-between', padding: '0 16px', boxSizing: 'border-box' }}>
          <Controls inputRef={p1TouchInput} align="left" />
          {mode === 'local2p' && <Controls inputRef={p2TouchInput} align="right" />}
        </div>
      )}

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
