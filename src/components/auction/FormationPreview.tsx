import { colors, fonts } from '../../theme';
import { useState } from 'react';
import type { Formation, PositionGroup, Xi } from '../../lib/auctionFormations';

interface FormationPreviewProps {
  formation: Formation;
  xi: Xi;
  /** position group of the lot on the block: its free slots glow */
  highlightGroup?: PositionGroup | null;
  width?: number;
}

const PITCH_RATIO = 1.3;

/** Photo with an initials fallback — the legend photos come from Wikimedia,
 * which now and then rate-limits a burst of requests. */
function PlayerFace({ name, imageUrl }: { name: string; imageUrl: string | null }) {
  const [failed, setFailed] = useState(false);
  if (!imageUrl || failed) {
    return <span>{name.trim().slice(0, 2).toUpperCase()}</span>;
  }
  return (
    <img
      src={imageUrl}
      alt={name}
      onError={() => setFailed(true)}
      style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%' }}
    />
  );
}

function surname(name: string): string {
  const parts = name.trim().split(/\s+/);
  const last = parts[parts.length - 1];
  return last.length > 11 ? `${last.slice(0, 10)}…` : last;
}

/** The XI being built, drawn on a pitch: filled slots show the photo and
 * surname of the player won, empty ones show their role. */
export function FormationPreview({ formation, xi, highlightGroup = null, width = 280 }: FormationPreviewProps) {
  const height = Math.round(width * PITCH_RATIO);
  const dot = Math.round(width * 0.16);
  const filled = formation.slots.filter((s) => xi[s.id]).length;

  return (
    <div style={{ width, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8 }}>
        <span style={{ color: colors.accentLight }}>{formation.id}</span>
        <span style={{ color: colors.textSecondary }}>
          {filled}/{formation.slots.length}
        </span>
      </div>

      <div
        style={{
          position: 'relative',
          width,
          height,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.2)',
          background:
            'repeating-linear-gradient(0deg, #1f5a2d 0px, #1f5a2d 26px, #226631 26px, #226631 52px)',
        }}
      >
        <svg viewBox="0 0 100 130" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <g fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={0.7}>
            <rect x={3} y={3} width={94} height={124} />
            <line x1={3} y1={65} x2={97} y2={65} />
            <circle cx={50} cy={65} r={11} />
            <rect x={26} y={3} width={48} height={20} />
            <rect x={38} y={3} width={24} height={8} />
            <rect x={26} y={107} width={48} height={20} />
            <rect x={38} y={119} width={24} height={8} />
          </g>
        </svg>

        {formation.slots.map((s) => {
          const lot = xi[s.id];
          const glow = !lot && highlightGroup === s.group;
          return (
            <div
              key={s.id}
              style={{
                position: 'absolute',
                left: `${s.x}%`,
                top: `${s.y}%`,
                transform: 'translate(-50%, -50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                width: dot + 26,
              }}
            >
              <div
                style={{
                  width: dot,
                  height: dot,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: lot ? '#0c0e0d' : 'rgba(10,12,11,0.55)',
                  border: lot
                    ? `2px solid ${colors.accentLight}`
                    : glow
                      ? `2px solid ${colors.accentLight}`
                      : '2px dashed rgba(255,255,255,0.5)',
                  boxShadow: glow ? '0 0 12px 3px rgba(76,217,100,0.85)' : 'none',
                  fontFamily: fonts.display,
                  fontSize: Math.max(9, Math.round(dot * 0.3)),
                  color: glow ? colors.accentLight : 'rgba(255,255,255,0.75)',
                }}
              >
                {lot ? <PlayerFace name={lot.name} imageUrl={lot.imageUrl} /> : s.label}
              </div>
              {lot && (
                <div
                  style={{
                    maxWidth: dot + 26,
                    fontSize: 9,
                    fontWeight: 800,
                    lineHeight: 1.1,
                    color: '#fff',
                    background: 'rgba(0,0,0,0.65)',
                    padding: '1px 4px',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {surname(lot.name)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
