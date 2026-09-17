import { useState } from 'react';
import { colors, fonts } from '../../theme';
import { TUTTI_LETTERS } from '../../data/tuttiCategories';

interface LetterPickerProps {
  onPick: (letter: string) => void;
  disabled?: boolean;
}

const SPIN_DURATION_MS = 1200;
const SPIN_TICK_MS = 60;

export function LetterPicker({ onPick, disabled }: LetterPickerProps) {
  const [manualOpen, setManualOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [spinLetter, setSpinLetter] = useState<string | null>(null);

  function spinRoulette() {
    setSpinning(true);
    setManualOpen(false);
    const startedAt = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startedAt;
      setSpinLetter(TUTTI_LETTERS[Math.floor(Math.random() * TUTTI_LETTERS.length)]);
      if (elapsed < SPIN_DURATION_MS) {
        setTimeout(tick, SPIN_TICK_MS);
      } else {
        const finalLetter = TUTTI_LETTERS[Math.floor(Math.random() * TUTTI_LETTERS.length)];
        setSpinLetter(finalLetter);
        setSpinning(false);
        onPick(finalLetter);
      }
    };
    tick();
  }

  if (spinning) {
    return (
      <div
        style={{
          fontFamily: fonts.display,
          fontSize: 48,
          color: colors.accentLight,
          width: 80,
          textAlign: 'center',
        }}
      >
        {spinLetter}
      </div>
    );
  }

  if (manualOpen) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxWidth: 340, justifyContent: 'center' }}>
          {TUTTI_LETTERS.map((letter) => (
            <button
              key={letter}
              disabled={disabled}
              onClick={() => onPick(letter)}
              style={{
                width: 34,
                height: 34,
                background: 'rgba(18,18,20,0.7)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                fontWeight: 700,
                cursor: disabled ? 'default' : 'pointer',
              }}
            >
              {letter}
            </button>
          ))}
        </div>
        <button
          onClick={() => setManualOpen(false)}
          style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 12, cursor: 'pointer' }}
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 14 }}>
      <button
        onClick={spinRoulette}
        disabled={disabled}
        style={{
          padding: '14px 28px',
          background: colors.accent,
          border: 'none',
          color: '#fff',
          fontWeight: 800,
          fontSize: 14,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          cursor: disabled ? 'default' : 'pointer',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        🎡 Girar ruleta
      </button>
      <button
        onClick={() => setManualOpen(true)}
        disabled={disabled}
        style={{
          padding: '14px 28px',
          background: 'none',
          border: '1px solid rgba(255,255,255,0.25)',
          color: colors.textSecondary,
          fontWeight: 700,
          fontSize: 14,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          cursor: disabled ? 'default' : 'pointer',
        }}
      >
        Elegir letra
      </button>
    </div>
  );
}
