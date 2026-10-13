import { useState } from 'react';
import type { Game } from '../types';
import { colors, fonts } from '../theme';
import { GameCard } from './GameCard';
import { FlagshipBadge } from './FlagshipBadge';
import { BackArrowIcon } from '../icons/BackArrowIcon';
import { useViewport } from '../hooks/useViewport';

interface DetailScreenProps {
  game: Game;
  onBack: () => void;
  onStart: () => void;
}

export function DetailScreen({ game, onBack, onStart }: DetailScreenProps) {
  const [backHovered, setBackHovered] = useState(false);
  const [startHovered, setStartHovered] = useState(false);
  const viewport = useViewport();
  const mobile = viewport === 'mobile';
  const tablet = viewport === 'tablet';

  return (
    <div style={{ position: 'relative', zIndex: 2, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <button
        onClick={onBack}
        onMouseEnter={() => setBackHovered(true)}
        onMouseLeave={() => setBackHovered(false)}
        style={{
          position: 'absolute',
          top: mobile ? 20 : 36,
          left: mobile ? 16 : tablet ? 28 : 56,
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'none',
          border: 'none',
          color: backHovered ? colors.accentLight : colors.textSecondary,
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: 0.5,
          cursor: 'pointer',
          padding: '6px 0',
        }}
      >
        <BackArrowIcon />
        VOLVER
      </button>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          alignItems: mobile ? 'flex-start' : 'center',
          gap: mobile ? 0 : tablet ? 40 : 72,
          padding: mobile ? '72px 20px 24px' : tablet ? '0 40px' : '0 90px',
          overflowY: 'auto',
        }}
      >
        <div style={{ maxWidth: 560, minWidth: 0 }}>
          {game.isFlagship && <FlagshipBadge style={{ marginBottom: 16 }} />}
          <h1
            style={{
              fontFamily: fonts.display,
              fontSize: mobile ? 34 : tablet ? 44 : 52,
              lineHeight: 1,
              margin: '0 0 18px 0',
              textTransform: 'uppercase',
              color: '#fff',
            }}
          >
            {game.name}
          </h1>
          <p style={{ fontSize: mobile ? 16 : 18, lineHeight: 1.6, color: colors.textSecondary, margin: '0 0 30px 0' }}>
            {game.shortDesc}
          </p>

          <div style={{ borderLeft: `3px solid ${colors.accent}`, paddingLeft: 20, marginBottom: 36 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: 1.5,
                color: colors.accentLight,
                marginBottom: 8,
                textTransform: 'uppercase',
              }}
            >
              Cómo se juega
            </div>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: '#e2e2e5', margin: 0 }}>{game.howToPlay}</p>
          </div>

          <button
            onClick={onStart}
            onMouseEnter={() => setStartHovered(true)}
            onMouseLeave={() => setStartHovered(false)}
            style={{
              width: mobile ? '100%' : undefined,
              padding: '14px 34px',
              background: startHovered ? colors.accentDark : colors.accent,
              border: 'none',
              color: '#fff',
              fontWeight: 800,
              fontSize: 15,
              letterSpacing: 1,
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Iniciar
          </button>
        </div>

        {!mobile && <GameCard variant="detail" iconKey={game.iconKey} />}
      </div>

      {!mobile && (
        <div style={{ position: 'absolute', bottom: 24, right: 40, color: colors.textDim, fontSize: 12, letterSpacing: 0.5 }}>
          Pichanguero · v0.1.0
        </div>
      )}
    </div>
  );
}
