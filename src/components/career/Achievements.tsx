import { useEffect, useState } from 'react';
import { colors, fonts } from '../../theme';
import { ACHIEVEMENTS, ACHIEVEMENT_EVENT, loadUnlockedAchievements } from '../../lib/careerAchievements';

const TOAST_MS = 4200;

/** Every achievement, unlocked ones first; locked ones stay readable so the
 * player knows what to go for. */
export function AchievementsPanel({ onClose }: { onClose: () => void }) {
  const [unlocked] = useState(loadUnlockedAchievements);
  const sorted = [...ACHIEVEMENTS].sort((a, b) => Number(unlocked.has(b.id)) - Number(unlocked.has(a.id)));
  const count = ACHIEVEMENTS.filter((a) => unlocked.has(a.id)).length;

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.78)', padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 640,
          maxWidth: '100%',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          background: colors.surface,
          borderTop: `3px solid ${colors.accent}`,
          border: '1px solid rgba(255,255,255,0.14)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, padding: '22px 24px 14px' }}>
          <h2 style={{ fontFamily: fonts.display, fontSize: 28, margin: 0, color: '#fff', textTransform: 'uppercase' }}>Logros</h2>
          <span style={{ fontFamily: fonts.display, fontSize: 18, color: colors.accentLight }}>
            {count} / {ACHIEVEMENTS.length}
          </span>
        </div>
        <div style={{ overflowY: 'auto', padding: '0 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 10 }}>
          {sorted.map((a) => {
            const done = unlocked.has(a.id);
            return (
              <div
                key={a.id}
                style={{
                  padding: '12px 14px',
                  background: done ? 'rgba(47,174,76,0.12)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${done ? 'rgba(47,174,76,0.5)' : 'rgba(255,255,255,0.1)'}`,
                  opacity: done ? 1 : 0.62,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 800, color: done ? '#fff' : colors.textSecondary }}>
                  {done ? '★ ' : '☆ '}
                  {a.title}
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.45, color: colors.textMuted, marginTop: 4 }}>{a.description}</div>
              </div>
            );
          })}
        </div>
        <div style={{ padding: '16px 24px 20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 26px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: colors.textSecondary,
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

/** Pops up for a few seconds whenever the career unlocks something new. */
export function AchievementToast() {
  const [titles, setTitles] = useState<string[]>([]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    function onUnlock(e: Event) {
      setTitles((e as CustomEvent<string[]>).detail);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setTitles([]), TOAST_MS);
    }
    window.addEventListener(ACHIEVEMENT_EVENT, onUnlock);
    return () => {
      window.removeEventListener(ACHIEVEMENT_EVENT, onUnlock);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (titles.length === 0) return null;
  return (
    <div
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 24,
        transform: 'translateX(-50%)',
        zIndex: 70,
        maxWidth: '92vw',
        padding: '12px 20px',
        background: 'rgba(12,16,13,0.96)',
        border: `1px solid ${colors.accent}`,
        boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
        pointerEvents: 'none',
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.accentLight }}>
        {titles.length === 1 ? 'Logro desbloqueado' : 'Logros desbloqueados'}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginTop: 3 }}>★ {titles.join(' · ')}</div>
    </div>
  );
}
