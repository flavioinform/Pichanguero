import { colors, fonts } from '../../theme';
import { FlagBadge } from './FlagBadge';
import { TrophyIcon } from './TrophyIcon';
import type { CareerEvent } from '../../lib/careerTypes';

interface EventSceneModalProps {
  event: CareerEvent;
  /** Shown above the title for a national-team call-up, per feedback that a
   * call-up scene should visibly show your country's flag. */
  countryName?: string | null;
  onContinue: () => void;
}

/** Placeholder "cutscene" for a career event, keyed by `event.sceneKey`.
 * This is the seam where a pre-generated video clip library plugs in later —
 * swap the gradient/icon background below for `<video src={clipFor(sceneKey)} />`
 * without touching anything that calls this component. */
const SCENE_STYLE: Record<CareerEvent['type'], { gradient: string; icon: string }> = {
  debut: { gradient: 'linear-gradient(160deg, #173a20, #0a0a0c)', icon: '⚽' },
  injury: { gradient: 'linear-gradient(160deg, #4a1414, #0a0a0c)', icon: '🩹' },
  trophy: { gradient: 'linear-gradient(160deg, #4a3c0a, #0a0a0c)', icon: '🏆' },
  call_up: { gradient: 'linear-gradient(160deg, #0f2a4a, #0a0a0c)', icon: '📣' },
  transfer_offer: { gradient: 'linear-gradient(160deg, #1d1d3a, #0a0a0c)', icon: '✍️' },
  transfer_rejected: { gradient: 'linear-gradient(160deg, #2a2a2a, #0a0a0c)', icon: '🚫' },
  loan_start: { gradient: 'linear-gradient(160deg, #2a3c1d, #0a0a0c)', icon: '🔄' },
  loan_return: { gradient: 'linear-gradient(160deg, #173a20, #0a0a0c)', icon: '🏠' },
  release: { gradient: 'linear-gradient(160deg, #2a2a2a, #0a0a0c)', icon: '📄' },
  retirement: { gradient: 'linear-gradient(160deg, #222, #0a0a0c)', icon: '🧤' },
};

export function EventSceneModal({ event, countryName, onContinue }: EventSceneModalProps) {
  const style = SCENE_STYLE[event.type];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.75)',
      }}
    >
      <div
        style={{
          width: 560,
          maxWidth: '92vw',
          padding: '48px 40px 36px',
          background: style.gradient,
          border: '1px solid rgba(255,255,255,0.14)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 18,
        }}
      >
        {event.type === 'call_up' && countryName && <FlagBadge countryName={countryName} width={80} />}
        {event.type === 'trophy' ? (
          <TrophyIcon tier={event.trophyTier ?? 'league'} size={64} />
        ) : (
          <div style={{ fontSize: 56, lineHeight: 1 }}>{style.icon}</div>
        )}
        <h2 style={{ fontFamily: fonts.display, fontSize: 30, margin: 0, color: '#fff', textTransform: 'uppercase' }}>
          {event.title}
        </h2>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: colors.textSecondary, margin: 0, maxWidth: 420 }}>
          {event.description}
        </p>
        <button
          onClick={onContinue}
          style={{
            marginTop: 10,
            padding: '12px 32px',
            borderRadius: 999,
            background: colors.accent,
            border: 'none',
            color: '#fff',
            fontWeight: 800,
            fontSize: 14,
            letterSpacing: 0.5,
            cursor: 'pointer',
          }}
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
