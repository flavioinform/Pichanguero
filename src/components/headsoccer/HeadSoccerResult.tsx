import { colors, fonts } from '../../theme';

interface HeadSoccerResultProps {
  winner: 1 | 2 | 'draw';
  p1Label: string;
  p2Label: string;
  scoreP1: number;
  scoreP2: number;
  onRematch: () => void;
  onBack: () => void;
  /** Online matches can't rematch locally — both peers would desync without
   * a fresh lobby handshake — so this hides the button and leaves only exit. */
  showRematch?: boolean;
}

export function HeadSoccerResult({ winner, p1Label, p2Label, scoreP1, scoreP2, onRematch, onBack, showRematch = true }: HeadSoccerResultProps) {
  const winnerLabel = winner === 'draw' ? 'Empate' : winner === 1 ? `${p1Label} gana` : `${p2Label} gana`;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        background: 'rgba(5,8,6,0.88)',
      }}
    >
      <div style={{ fontFamily: fonts.display, fontSize: 32, color: '#fff', textTransform: 'uppercase' }}>
        {winnerLabel}
      </div>
      <div style={{ fontFamily: fonts.display, fontSize: 44, color: colors.accentLight }}>
        {scoreP1} — {scoreP2}
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 10 }}>
        {showRematch && (
          <button
            onClick={onRematch}
            style={{
              padding: '12px 28px',
              borderRadius: 999,
              background: colors.accent,
              border: 'none',
              color: '#fff',
              fontWeight: 800,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Jugar de nuevo
          </button>
        )}
        <button
          onClick={onBack}
          style={{
            padding: '12px 24px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: colors.textSecondary,
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Volver al menú
        </button>
      </div>
    </div>
  );
}
