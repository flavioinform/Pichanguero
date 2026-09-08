import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { colors, fonts } from '../../theme';
import { generateGatoGrid, checkGatoAnswer, type GatoGrid, type Difficulty } from '../../lib/gatoGrid';
import { pickCpuMove } from '../../lib/gatoBot';
import { GatoBoard, type BoardTurn } from './GatoBoard';
import { DifficultySelect } from './DifficultySelect';

const ME = { id: 'me', label: 'Vos' };
const CPU = { id: 'cpu', label: 'CPU' };
const CPU_THINK_DELAY_MS = 1100;

interface GatoOfflineScreenProps {
  onBack: () => void;
}

export function GatoOfflineScreen({ onBack }: GatoOfflineScreenProps) {
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [matchKey, setMatchKey] = useState(0);
  const [grid, setGrid] = useState<GatoGrid | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [turns, setTurns] = useState<BoardTurn[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({ me: 0, cpu: 0 });
  const [currentTurn, setCurrentTurn] = useState<string>(ME.id);
  const [finished, setFinished] = useState(false);
  const [cpuThinking, setCpuThinking] = useState(false);
  const cpuMoveInFlight = useRef(false);

  useEffect(() => {
    if (!difficulty) return;
    let cancelled = false;
    setGrid(null);
    generateGatoGrid(difficulty)
      .then((g) => !cancelled && setGrid(g))
      .catch((err) => !cancelled && setLoadError(err instanceof Error ? err.message : 'No se pudo generar la grilla.'));
    return () => {
      cancelled = true;
    };
  }, [difficulty, matchKey]);

  function handlePlayAgain() {
    setTurns([]);
    setScores({ me: 0, cpu: 0 });
    setCurrentTurn(ME.id);
    setFinished(false);
    setLoadError(null);
    setMatchKey((k) => k + 1);
  }

  useEffect(() => {
    if (!grid || finished || currentTurn !== CPU.id || cpuMoveInFlight.current) return;

    cpuMoveInFlight.current = true;
    setCpuThinking(true);
    let cancelled = false;

    const usedCells = new Set(turns.map((t) => `${t.rowIndex}:${t.colIndex}`));

    const timer = setTimeout(async () => {
      try {
        const move = await pickCpuMove(grid.rowCriteria, grid.colCriteria, usedCells);
        if (cancelled) return;
        applyTurn(CPU.id, move.rowIndex, move.colIndex, move.answer, move.correct);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'La CPU no pudo jugar.');
      } finally {
        if (!cancelled) {
          setCpuThinking(false);
          cpuMoveInFlight.current = false;
        }
      }
    }, CPU_THINK_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      cpuMoveInFlight.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, currentTurn, finished]);

  function applyTurn(playerId: string, rowIndex: number, colIndex: number, answer: string, correct: boolean) {
    setTurns((prev) => {
      const next = [...prev, { rowIndex, colIndex, playerId, answer, isCorrect: correct }];
      if (next.length >= 9) setFinished(true);
      return next;
    });
    if (correct) setScores((prev) => ({ ...prev, [playerId]: (prev[playerId] ?? 0) + 1 }));
    setCurrentTurn(playerId === ME.id ? CPU.id : ME.id);
  }

  async function handleSubmitAnswer(rowIndex: number, colIndex: number, answer: string) {
    if (!grid) throw new Error('La grilla todavía no está lista.');
    const result = await checkGatoAnswer(answer, grid.rowCriteria[rowIndex], grid.colCriteria[colIndex]);
    applyTurn(ME.id, rowIndex, colIndex, answer, result.correct);
    return result;
  }

  if (!difficulty) {
    return <DifficultySelect onSelect={setDifficulty} onBack={onBack} />;
  }

  if (loadError) {
    return (
      <Centered>
        <div style={{ color: '#e05a5a', fontSize: 15, textAlign: 'center', maxWidth: 400 }}>{loadError}</div>
        <BackButton onClick={onBack} />
      </Centered>
    );
  }

  if (!grid) {
    return (
      <Centered>
        <div style={{ color: colors.textSecondary, fontSize: 15 }}>Armando la grilla…</div>
      </Centered>
    );
  }

  return (
    <GatoBoard
      rowCriteria={grid.rowCriteria}
      colCriteria={grid.colCriteria}
      turns={turns}
      scores={scores}
      me={ME}
      opponent={CPU}
      currentTurnPlayerId={finished ? null : currentTurn}
      finished={finished}
      onSubmitAnswer={handleSubmitAnswer}
      onExit={onBack}
      onPlayAgain={handlePlayAgain}
      turnLabel={cpuThinking ? 'CPU pensando…' : undefined}
    />
  );
}

function Centered({ children }: { children: ReactNode }) {
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
        gap: 18,
        fontFamily: fonts.body,
      }}
    >
      {children}
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 24px',
        background: 'none',
        border: '1px solid rgba(255,255,255,0.25)',
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: 0.5,
        cursor: 'pointer',
        textTransform: 'uppercase',
      }}
    >
      Volver al menú
    </button>
  );
}
