import { useState } from 'react';
import type { ReactNode } from 'react';
import { colors, fonts } from '../../theme';
import { useViewport } from '../../hooks/useViewport';

interface ModeCardProps {
  icon: ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  width?: number;
  height?: number;
}

export function ModeCard({ icon, label, description, onClick, width = 300, height = 380 }: ModeCardProps) {
  const [hovered, setHovered] = useState(false);
  const viewport = useViewport();
  const mobile = viewport === 'mobile';
  const tablet = viewport === 'tablet';

  // En celular la tarjeta es una fila ancha (ícono a la izquierda); en tablet es más chica.
  const cardWidth = mobile ? '100%' : tablet ? Math.min(width, 240) : width;
  const cardHeight = mobile ? 'auto' : tablet ? Math.min(height, 300) : height;
  const iconSize = mobile ? 64 : tablet ? 90 : 110;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: mobile ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: mobile ? 'flex-start' : 'center',
        gap: mobile ? 16 : 18,
        width: cardWidth,
        height: cardHeight,
        padding: mobile ? '16px' : '0 28px',
        textAlign: mobile ? 'left' : 'center',
        background: hovered ? 'rgba(12,20,14,0.92)' : 'rgba(10,10,12,0.88)',
        border: `3px solid ${hovered ? colors.accent : 'rgba(255,255,255,0.18)'}`,
        boxShadow: hovered ? '0 0 32px rgba(47,174,76,0.35)' : 'none',
        color: '#fff',
        cursor: 'pointer',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease',
      }}
    >
      <div
        style={{
          width: iconSize,
          height: iconSize,
          flexShrink: 0,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(47,174,76,0.12)',
        }}
      >
        <div style={{ display: 'flex', transform: mobile ? 'scale(0.6)' : tablet ? 'scale(0.82)' : undefined }}>{icon}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: mobile ? 'flex-start' : 'center', gap: mobile ? 6 : 18, minWidth: 0 }}>
        <span style={{ fontFamily: fonts.display, fontSize: mobile ? 22 : 26, letterSpacing: 0.5, textTransform: 'uppercase' }}>
          {label}
        </span>
        <span
          style={{
            fontSize: 14,
            color: colors.textSecondary,
            fontWeight: 400,
            textAlign: mobile ? 'left' : 'center',
            lineHeight: 1.5,
          }}
        >
          {description}
        </span>
      </div>
    </button>
  );
}
