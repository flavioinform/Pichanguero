import { useState } from 'react';
import { colors, fonts } from '../../theme';
import { PlayerAvatar } from './PlayerAvatar';
import { TrophyIcon } from './TrophyIcon';
import type { CareerPlayerState } from '../../lib/careerTypes';
import { ACHIEVEMENTS, legacyOf, loadUnlockedAchievements } from '../../lib/careerAchievements';
import { AchievementsPanel } from './Achievements';

interface CareerRetiredScreenProps {
  state: CareerPlayerState;
  onNewCareer: () => void;
  onBack: () => void;
}

export function CareerRetiredScreen({ state, onNewCareer, onBack }: CareerRetiredScreenProps) {
  const bestSeason = state.seasons.reduce<typeof state.seasons[number] | null>((best, s) => {
    if (!best || s.gls + s.ast > best.gls + best.ast) return s;
    return best;
  }, null);

  const legacy = legacyOf(state);
  const awards = state.awards ?? [];
  const [showAchievements, setShowAchievements] = useState(false);
  const unlockedCount = ACHIEVEMENTS.filter((a) => loadUnlockedAchievements().has(a.id)).length;

  return (
    <div
      style={{
        position: 'relative',
        zIndex: 2,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'safe center',
        overflowY: 'auto',
        gap: 20,
        padding: 24,
      }}
    >
      <PlayerAvatar imageUrl={state.avatarImageUrl} lastName={state.identity.lastName} size={96} />
      <h1 style={{ fontFamily: fonts.display, fontSize: 36, margin: 0, color: '#fff', textTransform: 'uppercase', textAlign: 'center' }}>
        {state.identity.lastName} cuelga los botines
      </h1>
      <div style={{ textAlign: 'center', padding: '12px 26px', border: `1px solid ${colors.accent}`, background: 'rgba(47,174,76,0.1)' }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.accentLight }}>
          Tu legado · {legacy.score} pts
        </div>
        <div style={{ fontFamily: fonts.display, fontSize: 26, color: '#fff', textTransform: 'uppercase', marginTop: 2 }}>{legacy.title}</div>
        <div style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>{legacy.blurb}</div>
      </div>
      <p style={{ fontSize: 14, color: colors.textSecondary, margin: 0, textAlign: 'center', maxWidth: 480 }}>
        Una carrera de {state.seasons.length} temporadas, {state.careerTotals.pj} partidos, {state.careerTotals.gls}{' '}
        goles y {state.careerTotals.ast} asistencias.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 24 }}>
        <Stat label="Partidos" value={state.careerTotals.pj} />
        <Stat label="Goles" value={state.careerTotals.gls} />
        <Stat label="Asistencias" value={state.careerTotals.ast} />
        <Stat label="Títulos" value={state.trophies.length} />
        <Stat label="Premios" value={awards.length} />
      </div>

      {awards.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, maxWidth: 560 }}>
          {awards.map((a, i) => (
            <span key={i} style={{ padding: '5px 12px', fontSize: 12, fontWeight: 700, color: '#f0cf6a', border: '1px solid rgba(224,185,74,0.5)', background: 'rgba(224,185,74,0.08)' }}>
              🥇 {a.label}
            </span>
          ))}
        </div>
      )}

      {bestSeason && (
        <p style={{ fontSize: 13, color: colors.textMuted, margin: 0 }}>
          Mejor temporada: {bestSeason.age} años en {bestSeason.clubName ?? 'club libre'} ({bestSeason.gls} goles,{' '}
          {bestSeason.ast} asistencias)
        </p>
      )}

      {state.trophies.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
          {state.trophies.map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: colors.accentLight }}>
              <TrophyIcon tier={t.tier} size={16} />
              {t.label}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 14, marginTop: 8 }}>
        <button
          onClick={onNewCareer}
          style={{
            padding: '14px 34px',
            borderRadius: 999,
            background: colors.accent,
            border: 'none',
            color: '#fff',
            fontWeight: 800,
            fontSize: 15,
            cursor: 'pointer',
          }}
        >
          Nueva carrera
        </button>
        <button
          onClick={onBack}
          style={{
            padding: '14px 28px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: colors.textSecondary,
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Volver a juegos
        </button>
        <button
          onClick={() => setShowAchievements(true)}
          style={{
            padding: '14px 24px',
            borderRadius: 999,
            background: 'none',
            border: `1px solid ${colors.accent}`,
            color: colors.accentLight,
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          ★ Logros {unlockedCount}/{ACHIEVEMENTS.length}
        </button>
      </div>
      {showAchievements && <AchievementsPanel onClose={() => setShowAchievements(false)} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: fonts.display, fontSize: 28, color: '#fff' }}>{value}</div>
      <div style={{ fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
    </div>
  );
}
