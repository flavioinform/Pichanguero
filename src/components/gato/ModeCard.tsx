import { useState } from 'react';
import type { ReactNode } from 'react';
import { colors, fonts } from '../../theme';

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

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        width,
        height,
        padding: '0 28px',
        background: hovered ? 'rgba(20,30,22,0.7)' : 'rgba(18,18,20,0.6)',
        border: `3px solid ${hovered ? colors.accent : 'rgba(255,255,255,0.18)'}`,
        boxShadow: hovered ? '0 0 32px rgba(47,174,76,0.35)' : 'none',
        color: '#fff',
        cursor: 'pointer',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease',
      }}
    >
      <div
        style={{
          width: 110,
          height: 110,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(47,174,76,0.12)',
        }}
      >
        {icon}
      </div>
      <span style={{ fontFamily: fonts.display, fontSize: 26, letterSpacing: 0.5, textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ fontSize: 14, color: colors.textSecondary, fontWeight: 400, textAlign: 'center', lineHeight: 1.5 }}>
        {description}
      </span>
    </button>
  );
}
