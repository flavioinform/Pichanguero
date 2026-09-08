import { useState } from 'react';
import { BallIcon } from '../icons/BallIcon';
import { colors } from '../theme';

interface NavArrowProps {
  direction: 'prev' | 'next';
  onClick: () => void;
}

export function NavArrow({ direction, onClick }: NavArrowProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      aria-label={direction === 'prev' ? 'Anterior' : 'Siguiente'}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flexShrink: 0,
        width: 48,
        height: 48,
        marginBottom: 'clamp(24px, 10vh, 60px)',
        borderRadius: '50%',
        border: `1px solid ${hovered ? colors.accent : 'rgba(255,255,255,0.25)'}`,
        background: 'rgba(10,10,12,0.55)',
        color: hovered ? colors.accentLight : '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
    >
      <BallIcon size={24} />
    </button>
  );
}
