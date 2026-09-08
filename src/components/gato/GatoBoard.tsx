import { Fragment, useState } from 'react';
import { colors, fonts } from '../../theme';
import type { GridCriterion } from '../../lib/gatoGrid';
import { PlayerAutocomplete } from './PlayerAutocomplete';
import { BackArrowIcon } from '../../icons/BackArrowIcon';

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

  const isMyTurn = currentTurnPlayerId === me.id;

  const turnByCell = new Map<string, BoardTurn>();
  turns.forEach((t) => turnByCell.set(`${t.rowIndex}:${t.colIndex}`, t));

  const playerLabel = (playerId: string) => (playerId === me.id ? me.label : opponent.label);

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

      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        <ScoreBadge label={me.label} score={myScore} highlight={isMyTurn && !finished} />
        <div style={{ fontFamily: fonts.display, fontSize: 22, color: colors.textMuted }}>VS</div>
        <ScoreBadge label={opponent.label} score={opponentScore} highlight={!isMyTurn && !finished} />
      </div>

      {!finished && (
        <div style={{ fontSize: 15, color: isMyTurn ? colors.accentLight : colors.textMuted, fontWeight: 700 }}>
          {turnLabel ?? (isMyTurn ? 'Tu turno' : `Turno de ${opponent.label}`)}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '160px repeat(3, 130px)',
          gridTemplateRows: '60px repeat(3, 100px)',
          gap: 4,
        }}
      >
        <div />
        {colCriteria.map((col) => (
          <HeaderCell key={col.id} label={col.label} />
        ))}

        {rowCriteria.map((row, rowIndex) => (
          <Fragment key={row.id}>
            <HeaderCell label={row.label} align="right" />
            {colCriteria.map((_, colIndex) => {
              const turn = turnByCell.get(`${rowIndex}:${colIndex}`);
              const isSelected = selected?.row === rowIndex && selected?.col === colIndex;
              const canSelect = !finished && isMyTurn && !turn;
              return (
                <BoardCell
                  key={colIndex}
                  turn={turn}
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
          fontSize: 13,
          color: highlight ? colors.accentLight : colors.textMuted,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {label}
      </div>
      <div style={{ fontFamily: fonts.display, fontSize: 32, color: '#fff' }}>{score}</div>
    </div>
  );
}

function HeaderCell({ label, align = 'center' }: { label: string; align?: 'center' | 'right' }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: align === 'right' ? 'flex-end' : 'center',
        textAlign: align,
        padding: '4px 10px',
        fontSize: 12,
        fontWeight: 700,
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
      }}
    >
      {label}
    </div>
  );
}

function BoardCell({
  turn,
  answeredBy,
  selected,
  disabled,
  onClick,
}: {
  turn?: BoardTurn;
  answeredBy: string | null;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const filled = Boolean(turn);
  const correct = turn?.isCorrect;

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
            ? correct
              ? 'rgba(47,174,76,0.15)'
              : 'rgba(224,90,90,0.12)'
            : 'rgba(18,18,20,0.5)',
        border: `1px solid ${selected ? colors.accent : filled ? (correct ? 'rgba(47,174,76,0.5)' : 'rgba(224,90,90,0.4)') : 'rgba(255,255,255,0.15)'}`,
        color: '#fff',
        cursor: disabled ? 'default' : 'pointer',
        padding: 8,
        textAlign: 'center',
      }}
    >
      {filled ? (
        <>
          <span style={{ fontSize: 13, fontWeight: 700, color: correct ? colors.accentLight : '#e05a5a' }}>
            {correct ? '✓' : '✗'} {turn!.answer}
          </span>
          <span style={{ fontSize: 10, color: colors.textMuted }}>{answeredBy}</span>
        </>
      ) : (
        <span style={{ fontSize: 20, color: 'rgba(255,255,255,0.25)' }}>{disabled ? '' : '+'}</span>
      )}
    </button>
  );
}
