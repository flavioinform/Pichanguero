import type { IconKey } from '../types';

interface GameIconProps {
  iconKey: IconKey;
  size: number;
  color: string;
  strokeWidth?: number;
}

export function GameIcon({ iconKey, size, color, strokeWidth = 1.4 }: GameIconProps) {
  if (iconKey === 'grid') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
        <rect x="3" y="3" width="18" height="18" rx="1" />
        <line x1="9" y1="3" x2="9" y2="21" />
        <line x1="15" y1="3" x2="15" y2="21" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="3" y1="15" x2="21" y2="15" />
      </svg>
    );
  }

  if (iconKey === 'dice') {
    const dotRadius = size >= 100 ? 1.3 : size >= 60 ? 1.4 : 1.4;
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8" cy="8" r={dotRadius} fill={color} stroke="none" />
        <circle cx="16" cy="8" r={dotRadius} fill={color} stroke="none" />
        <circle cx="8" cy="16" r={dotRadius} fill={color} stroke="none" />
        <circle cx="16" cy="16" r={dotRadius} fill={color} stroke="none" />
        <circle cx="12" cy="12" r={dotRadius} fill={color} stroke="none" />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
      <circle cx="12" cy="12" r="9" />
      <text
        x="12"
        y="16.5"
        textAnchor="middle"
        fontSize="10"
        fill={color}
        stroke="none"
        fontFamily="Anton, sans-serif"
      >
        ?
      </text>
    </svg>
  );
}
