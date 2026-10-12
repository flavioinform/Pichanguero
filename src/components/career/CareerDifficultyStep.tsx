import { useState } from 'react';
import { colors, fonts } from '../../theme';
import { CardArt } from '../CardArt';
import type { CareerDifficulty } from '../../lib/careerTypes';

interface CareerDifficultyStepProps {
  onChoose: (difficulty: CareerDifficulty) => void;
  onBack: () => void;
}

const OPTIONS: { value: CareerDifficulty; label: string; caption: string }[] = [
  { value: 'intensa', label: 'Intensa', caption: '1 decisión por temporada, inmersión profunda.' },
  { value: 'normal', label: 'Normal', caption: 'Decisiones solo en los momentos importantes.' },
  { value: 'expres', label: 'Exprés', caption: 'Varias temporadas por vez, ritmo rápido.' },
];

export function CareerDifficultyStep({ onChoose, onBack }: CareerDifficultyStepProps) {
  const [selected, setSelected] = useState<CareerDifficulty>('intensa');
  const active = OPTIONS.find((o) => o.value === selected)!;

  return (
    <div style={{ position: 'relative', zIndex: 2, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: 2,
          color: colors.textMuted,
          textTransform: 'uppercase',
          padding: '28px 56px 0',
        }}
      >
        Minijuegos Copero
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 72, padding: '0 90px' }}>
        <div
          style={{
            position: 'relative',
            width: 340,
            height: 440,
            flexShrink: 0,
            background: '#111113',
            overflow: 'hidden',
          }}
        >
          <CardArt iconKey="career" />
        </div>

        <div style={{ maxWidth: 560, padding: '36px 40px', background: 'rgba(10,10,12,0.86)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <h1
            style={{
              fontFamily: fonts.display,
              fontSize: 48,
              lineHeight: 1.05,
              margin: '0 0 18px 0',
              textTransform: 'uppercase',
              color: '#fff',
            }}
          >
            Construí tu carrera futbolística
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: colors.textSecondary, margin: '0 0 30px 0' }}>
            Elegí tu origen, tomá decisiones clave y dejá que el destino te lleve a una trayectoria única de títulos,
            estadísticas y momentos decisivos.
          </p>

          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            {OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => setSelected(o.value)}
                style={{
                  padding: '10px 22px',
                  borderRadius: 999,
                  border: selected === o.value ? 'none' : '1px solid rgba(255,255,255,0.25)',
                  background: selected === o.value ? '#fff' : 'rgba(255,255,255,0.06)',
                  color: selected === o.value ? colors.bg : colors.textSecondary,
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 13, color: colors.textSecondary, margin: '0 0 32px 0' }}>{active.caption}</p>

          <div style={{ display: 'flex', gap: 14 }}>
            <button
              onClick={() => onChoose(selected)}
              style={{
                padding: '14px 34px',
                borderRadius: 999,
                background: colors.accent,
                border: 'none',
                color: '#fff',
                fontWeight: 800,
                fontSize: 15,
                letterSpacing: 0.5,
                cursor: 'pointer',
              }}
            >
              Comenzar carrera
            </button>
            <button
              onClick={onBack}
              style={{
                padding: '14px 28px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: colors.textSecondary,
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Volver a juegos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
