import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { colors } from '../../theme';
import { jerseyColors } from '../../lib/countryVisuals';
import { FIELD_HEIGHT, FIELD_WIDTH } from '../../lib/headSoccer/physics';
import { withTaps, type GameState, type Input, type InputTaps } from '../../lib/headSoccer/types';
import { mergeSnapshot } from '../../lib/headSoccer/netSync';
import { HEAD_SOCCER_ONLINE } from '../../config/gameConfig';
import { useViewport } from '../../hooks/useViewport';
import { useGameLoop } from './useGameLoop';
import { ControlHint, GoalBanner } from './Hud';
import { Controls } from './Controls';
import { HeadSoccerResult } from './HeadSoccerResult';
import type { HeadSoccerMode } from './types';

interface OnlineProps {
  /** Host is always physics-index 0 (P1), guest is always index 1 (P2) —
   * both clients must agree on this without negotiating it per-match. */
  isHost: boolean;
  /** host only: the guest's keys for the next tick */
  takeRemoteInput: () => Input;
  sendInput: (input: Input) => void;
  /** host only: publish the authoritative game state */
  sendState: (state: GameState) => void;
  /** guest only: the newest host snapshot since the last call */
  takeRemoteState: () => GameState | null;
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
  // presses since the last tick, per source, so a tap shorter than a tick still counts
  const wasdTaps = useRef<InputTaps>({});
  const arrowTaps = useRef<InputTaps>({});
  const p1TouchTaps = useRef<InputTaps>({});
  const p2TouchTaps = useRef<InputTaps>({});

  /** what a source holds right now, plus its taps since the last tick (which it then forgets) */
  function read(input: MutableRefObject<Input>, taps: MutableRefObject<InputTaps>): Input {
    const out = withTaps(input.current, taps.current);
    taps.current = {};
    return out;
  }

  const p1Colors = jerseyColors(p1CountryName);
  const p2Colors = jerseyColors(p2CountryName);

  // Online mode: the local human always plays with WASD/touch regardless of
  // host/guest, and their input gets sent to the peer every tick; the other
  // physics slot reads from whatever last arrived over the broadcast channel.
  function getLocalOnlineInput(): Input {
    const input = mergeInputs(read(wasdInput, wasdTaps), read(p1TouchInput, p1TouchTaps), read(arrowInput, arrowTaps));
    online?.sendInput(input);
    return input;
  }

  const getP1Input =
    mode === 'online' && online
      ? online.isHost
        ? getLocalOnlineInput
        : online.takeRemoteInput
      : () =>
          mergeInputs(read(wasdInput, wasdTaps), read(p1TouchInput, p1TouchTaps), mode === 'cpu' ? read(arrowInput, arrowTaps) : emptyInput());

  const getP2Input =
    mode === 'online' && online
      ? online.isHost
        ? online.takeRemoteInput
        : getLocalOnlineInput
      : () => mergeInputs(read(arrowInput, arrowTaps), read(p2TouchInput, p2TouchTaps));

  // Online: both peers simulate locally with the latest inputs they know, so
  // play looks smooth; the host's snapshots keep the two from drifting apart.
  const lastSentPhase = useRef<GameState['phase']>('playing');
  const syncOut =
    mode === 'online' && online?.isHost
      ? (state: GameState, tick: number) => {
          const phaseChanged = state.phase !== lastSentPhase.current;
          if (tick % HEAD_SOCCER_ONLINE.snapshotEveryTicks !== 0 && !phaseChanged) return;
          lastSentPhase.current = state.phase;
          online.sendState(state);
        }
      : undefined;
  const syncIn =
    mode === 'online' && online && !online.isHost
      ? (current: GameState) => {
          const snapshot = online.takeRemoteState();
          return snapshot ? mergeSnapshot(current, snapshot, 1, HEAD_SOCCER_ONLINE.ownPositionTolerancePx) : null;
        }
      : undefined;

  const { canvasRef, hud, resetMatch } = useGameLoop({
    mode,
    getP1Input,
    getP2Input,
    syncOut,
    syncIn,
    p1Colors,
    p2Colors,
    labels: [shortLabel(p1CountryName), shortLabel(p2CountryName)],
  });

  useEffect(() => {
    function setKey(ref: MutableRefObject<Input>, key: keyof Input, value: boolean) {
      if (value && (key === 'jump' || key === 'kick')) (ref === wasdInput ? wasdTaps : arrowTaps).current[key] = true;
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

  const mobile = useViewport() === 'mobile';
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
        gap: 14,
      }}
    >
      <div
        style={{
          position: 'relative',
          // Si la pantalla es baja (celular acostado), la cancha se achica para que entre completa con los controles.
          width: `min(100%, 880px, calc((100dvh - ${mobile ? 190 : 150}px) * ${FIELD_WIDTH / FIELD_HEIGHT} + 32px))`,
          padding: '0 16px',
          boxSizing: 'border-box',
        }}
      >
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

        {online && !online.connected && (
          <div
            style={{
              position: 'absolute',
              top: '24%',
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

      {!mobile && (
        <div style={{ display: 'flex', width: '100%', maxWidth: 880, justifyContent: 'space-between', padding: '0 16px', boxSizing: 'border-box' }}>
          {mode === 'local2p' ? (
            <ControlHint moveKeys={['A', 'D']} jumpKey="W" kickKey="S" />
          ) : (
            <ControlHint moveKeys={['◀', '▶']} jumpKey="▲" kickKey="▼" />
          )}
          {mode === 'local2p' && <ControlHint moveKeys={['◀', '▶']} jumpKey="▲" kickKey="▼" align="right" />}
        </div>
      )}

      {hud.phase !== 'ended' && mobile && (
        <div style={{ display: 'flex', width: '100%', maxWidth: 880, justifyContent: 'space-between', padding: '0 16px', boxSizing: 'border-box' }}>
          <Controls
            inputRef={p1TouchInput}
            tapsRef={p1TouchTaps}
            align="left"
            size={mobile ? 56 : 40}
            spread={mobile && mode !== 'local2p'}
          />
          {mode === 'local2p' && <Controls inputRef={p2TouchInput} tapsRef={p2TouchTaps} align="right" size={mobile ? 48 : 40} />}
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

/** "Argentina" -> "ARG": fits the scoreboard. */
function shortLabel(countryName: string): string {
  return countryName
    .normalize('NFD')
    .replace(/[^A-Za-z]/g, '')
    .slice(0, 3)
    .toUpperCase();
}
