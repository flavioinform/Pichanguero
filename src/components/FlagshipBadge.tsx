import type { CSSProperties } from 'react';
import { colors } from '../theme';

export function FlagshipBadge({ style }: { style?: CSSProperties }) {
  return (
    <div
      style={{
        display: 'inline-block',
        background: colors.accent,
        color: '#fff',
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: 1.5,
        padding: '5px 12px',
        textTransform: 'uppercase',
        ...style,
      }}
    >
      Juego insignia
    </div>
  );
}
