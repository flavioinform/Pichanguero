import { colors, fonts } from '../../theme';
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
        gap: 36,
      }}
    >
      <h1
        style={{
          fontFamily: fonts.display,
          fontSize: 40,
          margin: 0,
          color: '#fff',
          textTransform: 'uppercase',
          textShadow: '0 2px 18px rgba(0,0,0,0.6)',
        }}
      >
        Elegí la dificultad
      </h1>

      <div style={{ display: 'flex', alignItems: 'stretch', gap: 24 }}>
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
      </div>

      {onBack && (
        <button
          onClick={onBack}
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
          Volver
        </button>
      )}
    </div>
  );
}
