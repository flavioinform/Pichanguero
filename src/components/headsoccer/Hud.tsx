import type { CSSProperties } from 'react';
import { colors, fonts } from '../../theme';

export function ControlHint({
  moveKeys,
  jumpKey,
  kickKey,
  align = 'left',
}: {
  moveKeys: [string, string];
  jumpKey: string;
  kickKey: string;
  align?: 'left' | 'right';
}) {
  const keyStyle: CSSProperties = {
    width: 22,
    height: 22,
    borderRadius: 5,
    background: '#1c2a3a',
    border: '1px solid rgba(255,255,255,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 800,
    color: '#fff',
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: align === 'right' ? 'row-reverse' : 'row',
        alignItems: 'center',
        gap: 8,
        padding: '6px 10px',
        borderRadius: 10,
        background: 'rgba(10,15,12,0.75)',
        border: '1px solid rgba(255,255,255,0.2)',
      }}
    >
      <div style={{ display: 'flex', gap: 3 }}>
        <span style={keyStyle}>{moveKeys[0]}</span>
        <span style={keyStyle}>{moveKeys[1]}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 9, color: colors.textMuted }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={keyStyle}>{jumpKey}</span> salto
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={keyStyle}>{kickKey}</span> patear
        </div>
      </div>
    </div>
  );
}

export function ClockChip({ label }: { label: string }) {
  return (
    <div
      style={{
        padding: '4px 14px',
        borderRadius: 999,
        background: 'rgba(10,15,12,0.75)',
        border: '1px solid rgba(255,255,255,0.2)',
        fontFamily: fonts.display,
        fontSize: 18,
        color: '#fff',
      }}
    >
      {label}
    </div>
  );
}

export function ScoreBar({
  p1Label,
  p1Color,
  scoreP1,
  p2Label,
  p2Color,
  scoreP2,
}: {
  p1Label: string;
  p1Color: string;
  scoreP1: number;
  p2Label: string;
  p2Color: string;
  scoreP2: number;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '6px 10px',
        borderRadius: 999,
        background: 'rgba(10,15,12,0.82)',
        border: '1px solid rgba(255,255,255,0.22)',
      }}
      title={`${p1Label} vs ${p2Label}`}
    >
      <span style={{ width: 16, height: 16, borderRadius: '50%', background: p1Color, border: '2px solid rgba(255,255,255,0.4)' }} />
      <span style={{ fontFamily: fonts.display, fontSize: 20, color: '#fff', padding: '0 10px' }}>
        {scoreP1} : {scoreP2}
      </span>
      <span style={{ width: 16, height: 16, borderRadius: '50%', background: p2Color, border: '2px solid rgba(255,255,255,0.4)' }} />
    </div>
  );
}

export function GoalBanner() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          fontFamily: fonts.display,
          fontSize: 64,
          color: '#ffd24c',
          textShadow: '0 0 18px rgba(0,0,0,0.7), 0 4px 0 rgba(0,0,0,0.4)',
          letterSpacing: 2,
          animation: 'headsoccer-goal-pop 0.35s ease-out',
        }}
      >
        ¡GOL!
        <style>{`@keyframes headsoccer-goal-pop { 0% { transform: scale(0.4); opacity: 0; } 60% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }`}</style>
      </div>
    </div>
  );
}
