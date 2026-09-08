import type { CSSProperties } from 'react';

interface AdSlotProps {
  label: string;
  style: CSSProperties;
  borderOpacity?: number;
  bgOpacity?: number;
  textOpacity?: number;
  fontSize?: number;
}

/**
 * Real product ad placeholder (not decoration) — kept as a reusable
 * component so it can be swapped for a live ad unit later.
 */
export function AdSlot({
  label,
  style,
  borderOpacity = 0.35,
  bgOpacity = 0.35,
  textOpacity = 0.45,
  fontSize = 11,
}: AdSlotProps) {
  return (
    <div
      style={{
        border: `1px dashed rgba(255,255,255,${borderOpacity})`,
        background: `rgba(0,0,0,${bgOpacity})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: `rgba(255,255,255,${textOpacity})`,
        fontSize,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        ...style,
      }}
    >
      {label}
    </div>
  );
}
