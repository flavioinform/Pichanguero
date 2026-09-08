import { getCellCandidates, type GridCriterion } from './gatoGrid';

/** Chance the CPU lands a correct answer on its turn. */
const CPU_ACCURACY = 0.6;

export interface CpuMove {
  rowIndex: number;
  colIndex: number;
  answer: string;
  correct: boolean;
  matchedPlayerName?: string;
}

/**
 * Picks a random unclaimed cell and "answers" it: with CPU_ACCURACY
 * probability it names a real player who satisfies that cell, otherwise it
 * whiffs with a placeholder wrong guess.
 */
export async function pickCpuMove(
  rowCriteria: readonly GridCriterion[],
  colCriteria: readonly GridCriterion[],
  usedCells: Set<string>
): Promise<CpuMove> {
  const available: { row: number; col: number }[] = [];
  rowCriteria.forEach((_, r) =>
    colCriteria.forEach((_, c) => {
      if (!usedCells.has(`${r}:${c}`)) available.push({ row: r, col: c });
    })
  );
  if (available.length === 0) throw new Error('No hay celdas disponibles.');

  const { row, col } = available[Math.floor(Math.random() * available.length)];
  const candidates = await getCellCandidates(rowCriteria[row], colCriteria[col]);

  if (candidates.length > 0 && Math.random() < CPU_ACCURACY) {
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    return { rowIndex: row, colIndex: col, answer: pick.name, correct: true, matchedPlayerName: pick.name };
  }

  return { rowIndex: row, colIndex: col, answer: '(sin respuesta)', correct: false };
}
