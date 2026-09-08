import { useState } from 'react';
import { colors, fonts } from '../theme';

interface LoadingScreenProps {
  gameName: string;
  onBack: () => void;
}

export function LoadingScreen({ gameName, onBack }: LoadingScreenProps) {
  const [hovered, setHovered] = useState(false);

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
        gap: 22,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          border: '4px solid rgba(255,255,255,0.15)',
          borderTopColor: colors.accent,
          animation: 'pichanguero-spin 0.9s linear infinite',
        }}
      />
      <div style={{ fontFamily: fonts.display, fontSize: 26, color: '#fff', textTransform: 'uppercase', letterSpacing: 1 }}>
        Cargando {gameName}…
      </div>
      <div style={{ fontSize: 14, color: colors.textMuted }}>(Próximamente)</div>
      <button
        onClick={onBack}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          marginTop: 14,
          padding: '10px 24px',
          background: 'none',
          border: `1px solid ${hovered ? colors.accent : 'rgba(255,255,255,0.25)'}`,
          color: hovered ? colors.accentLight : colors.textSecondary,
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: 0.5,
          cursor: 'pointer',
          textTransform: 'uppercase',
        }}
      >
        Volver al menú
      </button>
    </div>
  );
}
