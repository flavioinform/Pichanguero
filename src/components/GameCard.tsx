import { useState } from 'react';
import { GameIcon } from '../icons/GameIcon';
import { colors } from '../theme';
import type { IconKey } from '../types';

type GameCardVariant = 'selected' | 'lateral' | 'detail';

interface GameCardProps {
  variant: GameCardVariant;
  iconKey: IconKey;
  onClick?: () => void;
  ariaLabel?: string;
}

const variantStyles: Record<GameCardVariant, { iconSize: number; iconColor: string; strokeWidth: number }> = {
  selected: { iconSize: 90, iconColor: colors.accentLight, strokeWidth: 1.4 },
  lateral: { iconSize: 38, iconColor: colors.iconLateral, strokeWidth: 1.5 },
  detail: { iconSize: 110, iconColor: colors.accentLight, strokeWidth: 1.2 },
};

export function GameCard({ variant, iconKey, onClick, ariaLabel }: GameCardProps) {
  const [hovered, setHovered] = useState(false);
  const { iconSize, iconColor, strokeWidth } = variantStyles[variant];

  if (variant === 'selected') {
    return (
      <div
        style={{
          flexShrink: 0,
          width: 'clamp(140px, 17vw, 240px)',
          height: 'clamp(220px, 52vh, 380px)',
          border: `3px solid ${colors.accent}`,
          background: 'rgba(18,18,20,0.6)',
          boxShadow: '0 0 32px rgba(47,174,76,0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <GameIcon iconKey={iconKey} size={iconSize} color={iconColor} strokeWidth={strokeWidth} />
      </div>
    );
  }

  if (variant === 'detail') {
    return (
      <div
        style={{
          flexShrink: 0,
          width: 260,
          height: 320,
          border: '3px solid rgba(47,174,76,0.6)',
          background: 'rgba(18,18,20,0.5)',
          boxShadow: '0 0 40px rgba(47,174,76,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <GameIcon iconKey={iconKey} size={iconSize} color={iconColor} strokeWidth={strokeWidth} />
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flexShrink: 0,
        width: 'clamp(70px, 7vw, 100px)',
        height: 'clamp(90px, 22vh, 130px)',
        marginBottom: 'clamp(40px, 15vh, 90px)',
        border: `1px solid ${hovered ? 'rgba(47,174,76,0.7)' : 'rgba(255,255,255,0.18)'}`,
        background: hovered ? 'rgba(20,30,22,0.55)' : 'rgba(18,18,20,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
    >
      <GameIcon iconKey={iconKey} size={iconSize} color={iconColor} strokeWidth={strokeWidth} />
    </button>
  );
}
