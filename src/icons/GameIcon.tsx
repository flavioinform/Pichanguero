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

  if (iconKey === 'rosco') {
    const ring = Array.from({ length: 8 }, (_, i) => {
      const angle = (-Math.PI / 2) + (i * 2 * Math.PI) / 8;
      return { x: 12 + 8 * Math.cos(angle), y: 12 + 8 * Math.sin(angle) };
    });
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
        {ring.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={2} />
        ))}
        <circle cx="12" cy="12" r="1.2" fill={color} stroke="none" />
      </svg>
    );
  }

  if (iconKey === 'headsoccer') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
        <circle cx="12" cy="7" r="4" />
        <path d="M7 21v-3a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v3" />
        <circle cx="18" cy="18" r="2.4" fill={color} stroke="none" />
      </svg>
    );
  }

  if (iconKey === 'auction') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round">
        <rect x="3" y="7" width="9" height="4" rx="1" transform="rotate(-35 7.5 9)" />
        <line x1="10.5" y1="9.5" x2="19" y2="18" />
        <rect x="14" y="19" width="8" height="2" rx="0.5" />
      </svg>
    );
  }

  if (iconKey === 'career') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
        <path d="M7 4h10v4a5 5 0 0 1-10 0V4z" strokeLinejoin="round" />
        <path d="M7 5H4.5A1.5 1.5 0 0 0 3 6.5 3.5 3.5 0 0 0 6.5 10" />
        <path d="M17 5h2.5A1.5 1.5 0 0 1 21 6.5 3.5 3.5 0 0 1 17.5 10" />
        <line x1="12" y1="13" x2="12" y2="17" />
        <path d="M8.5 20.5h7" />
        <path d="M9.5 20.5c0-2 1-3 2.5-3.5 1.5 0.5 2.5 1.5 2.5 3.5" />
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
