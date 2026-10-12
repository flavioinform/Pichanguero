import { useState } from 'react';
import { GameIcon } from '../icons/GameIcon';
import { CardArt } from './CardArt';
import { colors } from '../theme';
import type { IconKey } from '../types';

type GameCardVariant = 'selected' | 'lateral' | 'detail';

/** Ancho de la card seleccionada; el menú lo usa para ubicar las demás alrededor. */
export const SELECTED_CARD_WIDTH = 'clamp(200px, 22vw, 320px)';
export const LATERAL_CARD_WIDTH = 'clamp(260px, 28vw, 420px)';

interface GameCardProps {
  variant: GameCardVariant;
  iconKey: IconKey;
  onClick?: () => void;
  ariaLabel?: string;
}

const variantStyles: Record<GameCardVariant, { iconSize: number; iconColor: string; strokeWidth: number; badge: number }> = {
  selected: { iconSize: 56, iconColor: '#fff', strokeWidth: 1.4, badge: 84 },
  lateral: { iconSize: 26, iconColor: '#fff', strokeWidth: 1.5, badge: 44 },
  detail: { iconSize: 64, iconColor: '#fff', strokeWidth: 1.2, badge: 96 },
};

function IconBadge({ iconKey, size, iconSize, iconColor, strokeWidth }: {
  iconKey: IconKey;
  size: number;
  iconSize: number;
  iconColor: string;
  strokeWidth: number;
}) {
  return (
    <div
      style={{
        position: 'relative',
        zIndex: 1,
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'rgba(10,10,12,0.55)',
        border: '1px solid rgba(255,255,255,0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <GameIcon iconKey={iconKey} size={iconSize} color={iconColor} strokeWidth={strokeWidth} />
    </div>
  );
}

export function GameCard({ variant, iconKey, onClick, ariaLabel }: GameCardProps) {
  const [hovered, setHovered] = useState(false);
  const { iconSize, iconColor, strokeWidth, badge } = variantStyles[variant];

  if (variant === 'selected') {
    return (
      <button
        onClick={onClick}
        aria-label={ariaLabel}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'relative',
          flexShrink: 0,
          width: SELECTED_CARD_WIDTH,
          height: 'clamp(220px, 52vh, 380px)',
          border: `3px solid ${colors.accent}`,
          background: colors.bg,
          boxShadow: hovered ? '0 0 44px rgba(47,174,76,0.5)' : '0 0 32px rgba(47,174,76,0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          cursor: 'pointer',
        }}
      >
        <CardArt iconKey={iconKey} />
        <IconBadge iconKey={iconKey} size={badge} iconSize={iconSize} iconColor={iconColor} strokeWidth={strokeWidth} />
      </button>
    );
  }

  if (variant === 'detail') {
    return (
      <div
        style={{
          position: 'relative',
          flexShrink: 0,
          width: 260,
          height: 320,
          border: '3px solid rgba(47,174,76,0.6)',
          background: colors.bg,
          boxShadow: '0 0 40px rgba(47,174,76,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <CardArt iconKey={iconKey} />
        <IconBadge iconKey={iconKey} size={badge} iconSize={iconSize} iconColor={iconColor} strokeWidth={strokeWidth} />
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
        position: 'relative',
        flexShrink: 0,
        width: LATERAL_CARD_WIDTH,
        height: 'clamp(220px, 52vh, 380px)',
        border: `1px solid ${hovered ? 'rgba(47,174,76,0.7)' : 'rgba(255,255,255,0.18)'}`,
        background: colors.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        cursor: 'pointer',
        filter: hovered ? 'none' : 'grayscale(1)',
        transition: 'filter 0.3s ease, border-color 0.3s ease',
      }}
    >
      <CardArt iconKey={iconKey} />
      <IconBadge iconKey={iconKey} size={badge} iconSize={iconSize} iconColor={iconColor} strokeWidth={strokeWidth} />
    </button>
  );
}
