import { Fragment, useEffect, useMemo, useState } from 'react';
import { colors, fonts } from '../../theme';
import { getPlayerImageByName, type GridCriterion, findCompletedGatoLines } from '../../lib/gatoGrid';
import { PlayerAutocomplete } from './PlayerAutocomplete';
import { BackArrowIcon } from '../../icons/BackArrowIcon';
import { getClubCrestUrl } from '../../lib/clubCrest';
import { getFlagUrl } from '../../data/countryFlags';
import { GATO } from '../../config/gameConfig';
import { useViewport } from '../../hooks/useViewport';
import type { ViewportSize } from '../../hooks/useViewport';

function getCriterionImageUrl(criterion: GridCriterion): string | null {
  return criterion.kind === 'club' ? getClubCrestUrl(criterion.id) : getFlagUrl(criterion.id);
}

// Grid geometry — kept as plain numbers (per screen size) because the line-strike
// overlay (see AnimatedLine below) has to compute exact cell centers in pixels to
// match the CSS grid template used further down.
interface GridGeometry {
  headerColWidth: number;
  cellWidth: number;
  headerRowHeight: number;
  cellHeight: number;
  gap: number;
}

const GEOMETRY: Record<ViewportSize, GridGeometry> = {
  desktop: { headerColWidth: 260, cellWidth: 210, headerRowHeight: 130, cellHeight: 170, gap: 6 },
  tablet: { headerColWidth: 190, cellWidth: 150, headerRowHeight: 100, cellHeight: 130, gap: 6 },
  mobile: { headerColWidth: 78, cellWidth: 84, headerRowHeight: 84, cellHeight: 92, gap: 4 },
};

function gridSize(g: GridGeometry) {
  return {
    width: g.headerColWidth + 3 * g.cellWidth + 3 * g.gap,
    height: g.headerRowHeight + 3 * g.cellHeight + 3 * g.gap,
  };
}

function cellCenter(row: number, col: number, g: GridGeometry) {
  return {
    x: g.headerColWidth + (col + 1) * g.gap + col * g.cellWidth + g.cellWidth / 2,
    y: g.headerRowHeight + (row + 1) * g.gap + row * g.cellHeight + g.cellHeight / 2,
  };
}

// The 8 classic tic-tac-toe lines, as [row, col] cell coordinates.

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
  const [timeLeft, setTimeLeft] = useState(GATO.turnSeconds);

  const isMyTurn = currentTurnPlayerId === me.id;
  const viewport = useViewport();
  const mobile = viewport === 'mobile';
  const geometry = GEOMETRY[viewport];
  const grid = gridSize(geometry);

  // Only a correct answer closes a cell — a wrong guess or a timeout just
  // bounces the turn to the other player (see the file-level constants).
  const closedCellByKey = new Map<string, BoardTurn>();
  const attemptsByCell = new Map<string, number>();
  turns.forEach((t) => {
    const key = `${t.rowIndex}:${t.colIndex}`;
    attemptsByCell.set(key, (attemptsByCell.get(key) ?? 0) + 1);
    if (t.isCorrect) closedCellByKey.set(key, t);
  });

  // A closed cell's photo is looked up by the answer text itself (not a
  // stored player id — see getPlayerImageByName) so it works identically
  // whether the correct answer came from the opponent online or the CPU
  // offline, neither of which hand the board anything beyond that text.
  const [imageByAnswer, setImageByAnswer] = useState<Record<string, string | null>>({});
  const closedAnswersKey = useMemo(
    () => [...new Set([...closedCellByKey.values()].map((t) => t.answer))].join('|'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [turns]
  );

  useEffect(() => {
    const answers = closedAnswersKey ? closedAnswersKey.split('|') : [];
    const missing = answers.filter((a) => !(a in imageByAnswer));
    if (missing.length === 0) return;
    let cancelled = false;
    Promise.all(missing.map(async (a) => [a, await getPlayerImageByName(a).catch(() => null)] as const)).then((pairs) => {
      if (cancelled) return;
      setImageByAnswer((prev) => {
        const next = { ...prev };
        for (const [a, url] of pairs) next[a] = url;
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closedAnswersKey]);

  const playerLabel = (playerId: string) => (playerId === me.id ? me.label : opponent.label);
  const completedLines = findCompletedGatoLines(
    turns.map((t) => ({ row: t.rowIndex, col: t.colIndex, playerId: t.playerId, correct: t.isCorrect }))
  );
  const gatoWinnerId = completedLines[0]?.playerId ?? null;

  // Resets whenever the turn changes; only the active player's own client
  // runs the countdown and fires the timeout (no server-side clock).
  useEffect(() => {
    setTimeLeft(GATO.turnSeconds);
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
        justifyContent: 'safe center',
        gap: mobile ? 14 : 24,
        padding: mobile ? '56px 8px 16px' : '0 24px',
        overflowY: 'auto',
      }}
    >
      <button
        onClick={onExit}
        style={{
          position: 'absolute',
          top: mobile ? 16 : 28,
          left: mobile ? 16 : 40,
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

      <div style={{ display: 'flex', alignItems: 'center', gap: mobile ? 20 : 44 }}>
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
            gridTemplateColumns: `${geometry.headerColWidth}px repeat(3, ${geometry.cellWidth}px)`,
            gridTemplateRows: `${geometry.headerRowHeight}px repeat(3, ${geometry.cellHeight}px)`,
            gap: geometry.gap,
          }}
        >
          <div />
          {colCriteria.map((col) => (
            <HeaderCell key={col.id} criterion={col} orientation="col" size={viewport} />
          ))}

          {rowCriteria.map((row, rowIndex) => (
            <Fragment key={row.id}>
              <HeaderCell criterion={row} orientation="row" size={viewport} />
              {colCriteria.map((_, colIndex) => {
                const key = `${rowIndex}:${colIndex}`;
                const turn = closedCellByKey.get(key);
                const attempts = attemptsByCell.get(key) ?? 0;
                const exhausted = !turn && attempts >= GATO.maxAttemptsPerCell;
                const isSelected = selected?.row === rowIndex && selected?.col === colIndex;
                const canSelect = !finished && isMyTurn && !turn && !exhausted;
                return (
                  <BoardCell
                    key={colIndex}
                    turn={turn}
                    imageUrl={turn ? (imageByAnswer[turn.answer] ?? null) : null}
                    exhausted={exhausted}
                    answeredBy={turn ? playerLabel(turn.playerId) : null}
                    selected={isSelected}
                    disabled={!canSelect}
                    size={viewport}
                    onClick={() => canSelect && setSelected({ row: rowIndex, col: colIndex })}
                  />
                );
              })}
            </Fragment>
          ))}
        </div>

        <svg
          width={grid.width}
          height={grid.height}
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
        >
          {completedLines.map((line) => {
            const [start, , end] = line.cells;
            const a = cellCenter(...start, geometry);
            const b = cellCenter(...end, geometry);
            return (
              <AnimatedLine
                key={line.key}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                color={line.playerId === me.id ? colors.accentLight : colors.warning}
                strokeWidth={mobile ? 4 : 7}
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
      {errorMsg && <div style={{ fontSize: 14, color: colors.danger }}>{errorMsg}</div>}

      {finished && (
        <ResultModal
          outcome={
            gatoWinnerId
              ? gatoWinnerId === me.id ? 'win' : 'loss'
              : myScore === opponentScore ? 'tie' : myScore > opponentScore ? 'win' : 'loss'
          }
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
  const titleColor = outcome === 'win' ? colors.accentLight : outcome === 'loss' ? colors.danger : '#fff';

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
          padding: '32px clamp(20px, 6vw, 56px)',
          margin: '0 16px',
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
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 14, marginTop: 8 }}>
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
        border: `2px solid ${urgent ? colors.danger : colors.accent}`,
        color: urgent ? colors.danger : colors.accentLight,
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
function AnimatedLine({
  x1,
  y1,
  x2,
  y2,
  color,
  strokeWidth,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  strokeWidth: number;
}) {
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
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeDasharray={length}
      strokeDashoffset={revealed ? 0 : length}
      style={{ transition: 'stroke-dashoffset 0.6s ease', filter: `drop-shadow(0 0 6px ${color})` }}
    />
  );
}

function HeaderCell({
  criterion,
  orientation,
  size,
}: {
  criterion: GridCriterion;
  orientation: 'row' | 'col';
  size: ViewportSize;
}) {
  const imageUrl = getCriterionImageUrl(criterion);
  const mobile = size === 'mobile';
  // En celular las filas también se apilan (imagen arriba, texto abajo): la columna es angosta.
  const isRow = orientation === 'row' && !mobile;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isRow ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: isRow ? 'flex-end' : 'center',
        gap: mobile ? 4 : isRow ? 12 : 8,
        padding: mobile ? '4px 2px' : isRow ? '4px 16px 4px 4px' : '10px 8px',
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
            width: mobile ? 30 : isRow ? 44 : 40,
            height: mobile ? 24 : isRow ? 44 : 28,
            objectFit: 'contain',
            flexShrink: 0,
          }}
        />
      )}
      <span
        style={{
          fontSize: mobile ? 9 : size === 'tablet' ? 12 : 14,
          fontWeight: 700,
          color: colors.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: mobile ? 0 : 0.3,
          lineHeight: 1.25,
          overflowWrap: 'anywhere',
        }}
      >
        {criterion.label}
      </span>
    </div>
  );
}

function BoardCell({
  turn,
  imageUrl,
  exhausted,
  answeredBy,
  selected,
  disabled,
  size,
  onClick,
}: {
  turn?: BoardTurn;
  imageUrl?: string | null;
  exhausted: boolean;
  answeredBy: string | null;
  selected: boolean;
  disabled: boolean;
  size: ViewportSize;
  onClick: () => void;
}) {
  const filled = Boolean(turn);
  const compact = size === 'mobile';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        overflow: 'hidden',
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
        padding: filled && imageUrl ? 0 : compact ? 4 : 10,
        textAlign: 'center',
      }}
    >
      {filled ? (
        <>
          {imageUrl ? (
            <>
              <img
                src={imageUrl}
                alt=""
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.45) 35%, rgba(0,0,0,0) 65%)',
                }}
              />
              <span
                style={{
                  position: 'relative',
                  fontSize: compact ? 9 : 13,
                  fontWeight: 700,
                  color: colors.accentLight,
                  marginTop: 'auto',
                  maxWidth: '100%',
                  overflowWrap: 'anywhere',
                  textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                }}
              >
                {turn!.answer}
              </span>
              <span
                style={{
                  position: 'relative',
                  fontSize: compact ? 8 : 12,
                  color: colors.textMuted,
                  marginBottom: compact ? 2 : 6,
                  textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                }}
              >
                {answeredBy}
              </span>
            </>
          ) : (
            <>
              <span style={{ fontSize: 16, fontWeight: 700, color: colors.accentLight }}>✓</span>
              <span style={{ fontSize: compact ? 9 : 13, fontWeight: 700, color: colors.accentLight, overflowWrap: 'anywhere' }}>{turn!.answer}</span>
              <span style={{ fontSize: compact ? 8 : 12, color: colors.textMuted }}>{answeredBy}</span>
            </>
          )}
        </>
      ) : exhausted ? (
        <span style={{ fontSize: compact ? 8 : 12, color: colors.textMuted, fontWeight: 700, textTransform: 'uppercase' }}>
          Nadie acertó
        </span>
      ) : (
        <span style={{ fontSize: 26, color: 'rgba(255,255,255,0.25)' }}>{disabled ? '' : '+'}</span>
      )}
    </button>
  );
}
