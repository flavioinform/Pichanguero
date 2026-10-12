import { useMemo, useState } from 'react';
import { colors, fonts } from '../../theme';
import type { CountryOption } from '../../lib/careerData';
import { jerseyColors } from '../../lib/countryVisuals';

export function CountryPickStep({
  title,
  countries,
  excludeId,
  onChoose,
  onBack,
}: {
  title: string;
  countries: CountryOption[];
  excludeId?: number;
  onChoose: (c: CountryOption) => void;
  onBack: () => void;
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = countries.filter((c) => c.id !== excludeId);
    return (q ? list.filter((c) => c.name.toLowerCase().includes(q)) : list).slice(0, 40);
  }, [countries, excludeId, query]);

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
        justifyContent: 'center',
        gap: 20,
        padding: 24,
      }}
    >
      <h2 style={{ fontFamily: fonts.display, fontSize: 30, margin: 0, color: '#fff', textTransform: 'uppercase' }}>
        {title}
      </h2>
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar país"
        style={{
          padding: '10px 14px',
          fontSize: 14,
          background: colors.surfaceRaised,
          border: '1px solid rgba(255,255,255,0.25)',
          color: '#fff',
          fontFamily: fonts.body,
          width: 320,
        }}
      />
      <div style={{ width: 320, maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.map((c) => {
          const { primary, secondary } = jerseyColors(c.name);
          return (
            <button
              key={c.id}
              onClick={() => onChoose(c)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                textAlign: 'left',
                padding: '9px 12px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: primary,
                  border: `2px solid ${secondary}`,
                  flexShrink: 0,
                }}
              />
              {c.name}
            </button>
          );
        })}
      </div>
      <button
        onClick={onBack}
        style={{
          padding: '10px 24px',
          background: 'none',
          border: '1px solid rgba(255,255,255,0.25)',
          color: colors.textSecondary,
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: 0.5,
          cursor: 'pointer',
          textTransform: 'uppercase',
        }}
      >
        Volver
      </button>
    </div>
  );
}
