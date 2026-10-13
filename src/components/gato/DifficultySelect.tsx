import { ModeSelectLayout } from '../ModeSelectLayout';
import type { Difficulty } from '../../lib/gatoGrid';
import { ModeCard } from './ModeCard';
import { DifficultyIcon } from './ModeIcons';

interface DifficultySelectProps {
  onSelect: (difficulty: Difficulty) => void;
  onBack?: () => void;
}

const OPTIONS: { value: Difficulty; label: string; description: string; stars: 1 | 2 | 3 }[] = [
  { value: 'easy', label: 'Fácil', description: 'Clubes mundialmente conocidos: Real Madrid, Barcelona, Chelsea…', stars: 1 },
  { value: 'medium', label: 'Medio', description: 'Clubes grandes de Europa, un poco menos obvios.', stars: 2 },
  { value: 'hard', label: 'Difícil', description: 'Incluye clubes menos conocidos para verdaderos fanáticos.', stars: 3 },
];

export function DifficultySelect({ onSelect, onBack }: DifficultySelectProps) {
  return (
    <ModeSelectLayout title="Elegí la dificultad" onBack={onBack} backLabel="Volver">
      {OPTIONS.map((opt) => (
        <ModeCard
          key={opt.value}
          icon={<DifficultyIcon filled={opt.stars} />}
          label={opt.label}
          description={opt.description}
          onClick={() => onSelect(opt.value)}
          width={240}
          height={320}
        />
      ))}
    </ModeSelectLayout>
  );
}
