import { Fragment, useEffect, useState } from 'react';
import { colors, fonts } from '../../theme';
import { MAX_ATTEMPTS_PER_CELL, type GridCriterion } from '../../lib/gatoGrid';
import { PlayerAutocomplete } from './PlayerAutocomplete';
import { BackArrowIcon } from '../../icons/BackArrowIcon';
import { getClubCrestUrl } from '../../lib/clubCrest';
import { getFlagUrl } from '../../data/countryFlags';

function getCriterionImageUrl(criterion: GridCriterion): string | null {
  return criterion.kind === 'club' ? getClubCrestUrl(criterion.id) : getFlagUrl(criterion.id);
}

const TURN_SECONDS = 30;

// Grid geometry — kept as named constants because the line-strike overlay
// (see AnimatedLine below) has to compute exact cell centers in pixels to
// match the CSS grid template used further down.
const HEADER_COL_WIDTH = 260;
const CELL_WIDTH = 210;
const HEADER_ROW_HEIGHT = 130;
const CELL_HEIGHT = 170;
const GRID_GAP = 6;
const GRID_WIDTH = HEADER_COL_WIDTH + 3 * CELL_WIDTH + 3 * GRID_GAP;
const GRID_HEIGHT = HEADER_ROW_HEIGHT + 3 * CELL_HEIGHT + 3 * GRID_GAP;

function cellCenter(row: number, col: number) {
  return {
    x: HEADER_COL_WIDTH + (col + 1) * GRID_GAP + col * CELL_WIDTH + CELL_WIDTH / 2,
    y: HEADER_ROW_HEIGHT + (row + 1) * GRID_GAP + row * CELL_HEIGHT + CELL_HEIGHT / 2,
  };
}

// The 8 classic tic-tac-toe lines, as [row, col] cell coordinates.
const GATO_LINES: [number, number][][] = [
  [
    [0, 0],
    [0, 1],
    [0, 2],
  ],
  [
    [1, 0],
    [1, 1],
    [1, 2],
  ],
  [
    [2, 0],
    [2, 1],
    [2, 2],
  ],
  [
    [0, 0],
    [1, 0],
    [2, 0],
  ],
  [
    [0, 1],
    [1, 1],
    [2, 1],
  ],
  [
    [0, 2],
    [1, 2],
    [2, 2],
  ],
  [
    [0, 0],
    [1, 1],
    [2, 2],
  ],
  [
    [0, 2],
    [1, 1],
    [2, 0],
  ],
];

interface CompletedLine {
  key: string;
  cells: [number, number][];
  playerId: string;
}

/** Lines where all 3 cells were correctly answered by the same player —
 * a real "gato" (tic-tac-toe) worth celebrating, independent of who's
 * ahead on total correct answers. */
function findCompletedLines(closedCellByKey: Map<string, BoardTurn>): CompletedLine[] {
  const found: CompletedLine[] = [];
  for (const cells of GATO_LINES) {
    const cellTurns = cells.map(([r, c]) => closedCellByKey.get(`${r}:${c}`));
    const [a, b, c] = cellTurns;
    if (a && b && c && a.playerId === b.playerId && b.playerId === c.playerId) {
      found.push({ key: cells.map(([r, cc]) => `${r}${cc}`).join('-'), cells, playerId: a.playerId });
    }
  }
  return found;
}

export interface BoardTurn {
  rowIndex: number;
  colIndex: number;
  playerId: string;
  answer: string;
  isCorrect: boolean;
}

export interface BoardPlayer {
  id: string;
  label: string;
}

export interface GatoBoardProps {
  rowCriteria: readonly [GridCriterion, GridCriterion, GridCriterion];
  colCriteria: readonly [GridCriterion, GridCriterion, GridCriterion];
  turns: BoardTurn[];
  scores: Record<string, number>;
  me: BoardPlayer;
  opponent: BoardPlayer;
  currentTurnPlayerId: string | null;
  finished: boolean;
  onSubmitAnswer: (rowIndex: number, colIndex: number, answer: string) => Promise<{ correct: boolean; matchedPlayerName?: string }>;
  onTimeout: () => Promise<void>;
  onExit: () => void;
  onPlayAgain: () => void;
  turnLabel?: string;
}

export function GatoBoard({
  rowCriteria,
  colCriteria,
  turns,
  scores,
  me,
  opponent,
  currentTurnPlayerId,
  finished,
  onSubmitAnswer,
  onTimeout,
  onExit,
  onPlayAgain,
  turnLabel,
}: GatoBoardProps) {
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [autocompleteKey, setAutocompleteKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(TURN_SECONDS);

  const isMyTurn = currentTurnPlayerId === me.id;

  // Only a correct answer closes a cell — a wrong guess or a timeout just
  // bounces the turn to the other player (see the file-level constants).
  const closedCellByKey = new Map<string, BoardTurn>();
  const attemptsByCell = new Map<string, number>();
  turns.forEach((t) => {
    const key = `${t.rowIndex}:${t.colIndex}`;
    attemptsByCell.set(key, (attemptsByCell.get(key) ?? 0) + 1);
    if (t.isCorrect) closedCellByKey.set(key, t);
  });

  const playerLabel = (playerId: string) => (playerId === me.id ? me.label : opponent.label);
  const completedLines = findCompletedLines(closedCellByKey);

  // Resets whenever the turn changes; only the active player's own client
  // runs the countdown and fires the timeout (no server-side clock).
  useEffect(() => {
    setTimeLeft(TURN_SECONDS);
    if (finished || !isMyTurn) return;

    const interval = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [currentTurnPlayerId, finished, isMyTurn]);

  useEffect(() => {
    if (!isMyTurn || finished || timeLeft > 0) return;
    setSelected(null);
    setAnswer(null);
    setAutocompleteKey((k) => k + 1);
    setLastResult('¡Se acabó el tiempo! — le toca al rival.');
    onTimeout().catch((err) => setErrorMsg(err instanceof Error ? err.message : 'Algo salió mal.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, isMyTurn, finished]);

  async function handleSubmit() {
    if (!selected || !answer) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const result = await onSubmitAnswer(selected.row, selected.col, answer);
      setLastResult(result.correct ? `¡Correcto! ${result.matchedPlayerName ?? answer}` : 'Incorrecto — le toca al rival.');
      setSelected(null);
      setAnswer(null);
      setAutocompleteKey((k) => k + 1);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Algo salió mal.');
    } finally {
      setSubmitting(false);
    }
  }

  const myScore = scores[me.id] ?? 0;
  const opponentScore = scores[opponent.id] ?? 0;

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
        gap: 24,
        padding: '0 24px',
      }}
    >
      <button
        onClick={onExit}
        style={{
          position: 'absolute',
          top: 28,
          left: 40,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'none',
          border: 'none',
          color: colors.textSecondary,
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: 0.5,
          cursor: 'pointer',
          padding: '6px 0',
        }}
      >
        <BackArrowIcon />
        SALIR
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 44 }}>
        <ScoreBadge label={me.label} score={myScore} highlight={isMyTurn && !finished} />
        <div style={{ fontFamily: fonts.display, fontSize: 28, color: colors.textMuted }}>VS</div>
        <ScoreBadge label={opponent.label} score={opponentScore} highlight={!isMyTurn && !finished} />
      </div>

      {!finished && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 17, color: isMyTurn ? colors.accentLight : colors.textMuted, fontWeight: 700 }}>
            {turnLabel ?? (isMyTurn ? 'Tu turno' : `Turno de ${opponent.label}`)}
          </div>
          {isMyTurn && !turnLabel && <TimerBadge secondsLeft={timeLeft} />}
        </div>
      )}

      <div style={{ position: 'relative' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `${HEADER_COL_WIDTH}px repeat(3, ${CELL_WIDTH}px)`,
            gridTemplateRows: `${HEADER_ROW_HEIGHT}px repeat(3, ${CELL_HEIGHT}px)`,
            gap: GRID_GAP,
          }}
        >
          <div />
          {colCriteria.map((col) => (
            <HeaderCell key={col.id} criterion={col} orientation="col" />
          ))}

          {rowCriteria.map((row, rowIndex) => (
            <Fragment key={row.id}>
              <HeaderCell criterion={row} orientation="row" />
              {colCriteria.map((_, colIndex) => {
                const key = `${rowIndex}:${colIndex}`;
                const turn = closedCellByKey.get(key);
                const attempts = attemptsByCell.get(key) ?? 0;
                const exhausted = !turn && attempts >= MAX_ATTEMPTS_PER_CELL;
                const isSelected = selected?.row === rowIndex && selected?.col === colIndex;
                const canSelect = !finished && isMyTurn && !turn && !exhausted;
                return (
                  <BoardCell
                    key={colIndex}
                    turn={turn}
                    exhausted={exhausted}
                    answeredBy={turn ? playerLabel(turn.playerId) : null}
                    selected={isSelected}
                    disabled={!canSelect}
                    onClick={() => canSelect && setSelected({ row: rowIndex, col: colIndex })}
                  />
                );
              })}
            </Fragment>
          ))}
        </div>

        <svg
          width={GRID_WIDTH}
          height={GRID_HEIGHT}
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
        >
          {completedLines.map((line) => {
            const [start, , end] = line.cells;
            const a = cellCenter(...start);
            const b = cellCenter(...end);
            return (
              <AnimatedLine
                key={line.key}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                color={line.playerId === me.id ? colors.accentLight : '#e0c15a'}
              />
            );
          })}
        </svg>
      </div>

      {selected && !finished && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <PlayerAutocomplete key={autocompleteKey} onChange={setAnswer} disabled={submitting} onSubmit={handleSubmit} />
          <button
            onClick={handleSubmit}
            disabled={submitting || !answer}
            style={{
              padding: '10px 24px',
              background: colors.accent,
              border: 'none',
              color: '#fff',
              fontWeight: 800,
              fontSize: 14,
              textTransform: 'uppercase',
              cursor: submitting ? 'default' : 'pointer',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            Responder
          </button>
        </div>
      )}

      {lastResult && !finished && <div style={{ fontSize: 14, color: colors.textSecondary }}>{lastResult}</div>}
      {errorMsg && <div style={{ fontSize: 14, color: '#e05a5a' }}>{errorMsg}</div>}

      {finished && (
        <ResultModal
          outcome={myScore === opponentScore ? 'tie' : myScore > opponentScore ? 'win' : 'loss'}
          myScore={myScore}
          opponentScore={opponentScore}
          onPlayAgain={onPlayAgain}
          onExit={onExit}
        />
      )}
    </div>
  );
}

function ResultModal({
  outcome,
  myScore,
  opponentScore,
  onPlayAgain,
  onExit,
}: {
  outcome: 'win' | 'loss' | 'tie';
  myScore: number;
  opponentScore: number;
  onPlayAgain: () => void;
  onExit: () => void;
}) {
  const title = outcome === 'tie' ? 'Empate' : outcome === 'win' ? '¡Ganaste!' : 'Perdiste';
  const titleColor = outcome === 'win' ? colors.accentLight : outcome === 'loss' ? '#e05a5a' : '#fff';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
          padding: '40px 56px',
          background: '#141416',
          border: `2px solid ${colors.accent}`,
          boxShadow: '0 0 40px rgba(47,174,76,0.3)',
        }}
      >
        <div style={{ fontFamily: fonts.display, fontSize: 40, color: titleColor, textTransform: 'uppercase' }}>
          {title}
        </div>
        <div style={{ fontSize: 18, color: colors.textSecondary }}>
          {myScore} — {opponentScore}
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
          <button
            onClick={onPlayAgain}
            style={{
              padding: '12px 28px',
              background: colors.accent,
              border: 'none',
              color: '#fff',
              fontWeight: 800,
              fontSize: 14,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Jugar de nuevo
          </button>
          <button
            onClick={onExit}
            style={{
              padding: '12px 28px',
              background: 'none',
              border: '1px solid rgba(255,255,255,0.25)',
              color: colors.textSecondary,
              fontWeight: 600,
              fontSize: 14,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Volver al menú
          </button>
        </div>
      </div>
    </div>
  );
}

function ScoreBadge({ label, score, highlight }: { label: string; score: number; highlight: boolean }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          fontSize: 15,
          color: highlight ? colors.accentLight : colors.textMuted,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {label}
      </div>
      <div style={{ fontFamily: fonts.display, fontSize: 42, color: '#fff' }}>{score}</div>
    </div>
  );
}

function TimerBadge({ secondsLeft }: { secondsLeft: number }) {
  const urgent = secondsLeft <= 10;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 34,
        height: 34,
        borderRadius: '50%',
        border: `2px solid ${urgent ? '#e05a5a' : colors.accent}`,
        color: urgent ? '#e05a5a' : colors.accentLight,
        fontFamily: fonts.display,
        fontSize: 15,
      }}
    >
      {secondsLeft}
    </div>
  );
}

/**
 * Draws itself from nothing to a full stroke over ~0.6s using the classic
 * dash-offset trick. A fresh `key` (see findCompletedLines' `line.key`)
 * makes React mount a new instance exactly once per newly-completed line,
 * so it animates in once and then just stays drawn on later re-renders.
 */
function AnimatedLine({ x1, y1, x2, y2, color }: { x1: number; y1: number; x2: number; y2: number; color: string }) {
  const [revealed, setRevealed] = useState(false);
  const length = Math.hypot(x2 - x1, y2 - y1);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={color}
      strokeWidth={7}
      strokeLinecap="round"
      strokeDasharray={length}
      strokeDashoffset={revealed ? 0 : length}
      style={{ transition: 'stroke-dashoffset 0.6s ease', filter: `drop-shadow(0 0 6px ${color})` }}
    />
  );
}

function HeaderCell({ criterion, orientation }: { criterion: GridCriterion; orientation: 'row' | 'col' }) {
  const imageUrl = getCriterionImageUrl(criterion);
  const isRow = orientation === 'row';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isRow ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: isRow ? 'flex-end' : 'center',
        gap: isRow ? 12 : 8,
        padding: isRow ? '4px 16px 4px 4px' : '10px 8px',
        textAlign: isRow ? 'right' : 'center',
      }}
    >
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
          style={{
            width: isRow ? 44 : 40,
            height: isRow ? 44 : 28,
            objectFit: 'contain',
            flexShrink: 0,
          }}
        />
      )}
      <span
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: colors.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: 0.3,
          lineHeight: 1.25,
        }}
      >
        {criterion.label}
      </span>
    </div>
  );
}

function BoardCell({
  turn,
  exhausted,
  answeredBy,
  selected,
  disabled,
  onClick,
}: {
  turn?: BoardTurn;
  exhausted: boolean;
  answeredBy: string | null;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const filled = Boolean(turn);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        background: selected
          ? 'rgba(47,174,76,0.25)'
          : filled
            ? 'rgba(47,174,76,0.15)'
            : exhausted
              ? 'rgba(255,255,255,0.04)'
              : 'rgba(18,18,20,0.5)',
        border: `2px solid ${selected ? colors.accent : filled ? 'rgba(47,174,76,0.5)' : 'rgba(255,255,255,0.15)'}`,
        color: '#fff',
        cursor: disabled ? 'default' : 'pointer',
        padding: 10,
        textAlign: 'center',
      }}
    >
      {filled ? (
        <>
          <span style={{ fontSize: 16, fontWeight: 700, color: colors.accentLight }}>✓ {turn!.answer}</span>
          <span style={{ fontSize: 12, color: colors.textMuted }}>{answeredBy}</span>
        </>
      ) : exhausted ? (
        <span style={{ fontSize: 12, color: colors.textMuted, fontWeight: 700, textTransform: 'uppercase' }}>
          Nadie acertó
        </span>
      ) : (
        <span style={{ fontSize: 26, color: 'rgba(255,255,255,0.25)' }}>{disabled ? '' : '+'}</span>
      )}
    </button>
  );
}
