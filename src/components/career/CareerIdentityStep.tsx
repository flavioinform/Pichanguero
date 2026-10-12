import { useEffect, useMemo, useState } from 'react';
import { colors, fonts } from '../../theme';
import { fetchCountries, type CountryOption } from '../../lib/careerData';
import { FlagBadge } from './FlagBadge';
import { JerseyPhoto } from './JerseyPhoto';
import type { CareerIdentity, Foot, PositionCode } from '../../lib/careerTypes';

interface CareerIdentityStepProps {
  onSubmit: (identity: CareerIdentity) => void;
  onBack: () => void;
}

const POSITIONS: { code: PositionCode; label: string; x: number; y: number }[] = [
  { code: 'POR', label: 'POR', x: 50, y: 92 },
  { code: 'DFC', label: 'DFC', x: 50, y: 74 },
  { code: 'LI', label: 'LI', x: 18, y: 68 },
  { code: 'LD', label: 'LD', x: 82, y: 68 },
  { code: 'MCD', label: 'MCD', x: 50, y: 58 },
  { code: 'MC', label: 'MC', x: 50, y: 46 },
  { code: 'MI', label: 'MI', x: 18, y: 46 },
  { code: 'MD', label: 'MD', x: 82, y: 46 },
  { code: 'MCO', label: 'MCO', x: 50, y: 32 },
  { code: 'EI', label: 'EI', x: 20, y: 20 },
  { code: 'ED', label: 'ED', x: 80, y: 20 },
  { code: 'DC', label: 'DC', x: 50, y: 14 },
];

export function CareerIdentityStep({ onSubmit, onBack }: CareerIdentityStepProps) {
  const [lastName, setLastName] = useState('');
  const [number, setNumber] = useState(9);
  const [foot, setFoot] = useState<Foot>('derecha');
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [countryQuery, setCountryQuery] = useState('');
  const [nationality, setNationality] = useState<CountryOption | null>(null);
  const [position, setPosition] = useState<PositionCode>('DC');

  useEffect(() => {
    fetchCountries()
      .then(setCountries)
      .catch(() => setCountries([]));
  }, []);

  const filteredCountries = useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    const list = q ? countries.filter((c) => c.name.toLowerCase().includes(q)) : countries;
    return list.slice(0, 40);
  }, [countries, countryQuery]);

  const canSubmit = lastName.trim().length > 0 && number > 0 && nationality !== null;

  function handleSubmit() {
    if (!canSubmit || !nationality) return;
    onSubmit({
      lastName: lastName.trim(),
      number,
      foot,
      nationality: { id: nationality.id, name: nationality.name, code: nationality.code },
      position,
    });
  }

  return (
    <div style={{ position: 'relative', zIndex: 2, width: '100%', height: '100%', overflowY: 'auto', padding: '36px 56px' }}>
      <h1 style={{ fontFamily: fonts.display, fontSize: 32, margin: '0 0 24px 0', color: '#fff', textTransform: 'uppercase' }}>
        Definí tu identidad
      </h1>

      <div style={{ display: 'flex', gap: 48, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <section style={{ flex: '0 0 220px' }}>
          <Label>Identidad</Label>
          <JerseyPhoto lastName={lastName || 'JUGADOR'} number={number} countryName={nationality?.name ?? null} width={200} />
          <div style={{ marginTop: 16 }}>
            <FieldLabel>Apellido</FieldLabel>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value.toUpperCase().slice(0, 16))}
              placeholder="APELLIDO"
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <div style={{ flex: 1 }}>
              <FieldLabel>Número</FieldLabel>
              <input
                type="number"
                min={1}
                max={99}
                value={number}
                onChange={(e) => setNumber(Math.max(1, Math.min(99, Number(e.target.value) || 1)))}
                style={inputStyle}
              />
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <FieldLabel>Pierna hábil</FieldLabel>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['izquierda', 'derecha'] as Foot[]).map((f) => (
                <PillToggle key={f} active={foot === f} onClick={() => setFoot(f)}>
                  {f === 'izquierda' ? 'Izquierda' : 'Derecha'}
                </PillToggle>
              ))}
            </div>
          </div>
        </section>

        <section style={{ flex: '1 1 260px', minWidth: 220 }}>
          <Label>Nacionalidad</Label>
          <input
            value={countryQuery}
            onChange={(e) => setCountryQuery(e.target.value)}
            placeholder="Buscar país"
            style={{ ...inputStyle, width: '100%', marginBottom: 10 }}
          />
          <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filteredCountries.map((c) => (
              <button
                key={c.id}
                onClick={() => setNationality(c)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  textAlign: 'left',
                  padding: '9px 12px',
                  background: nationality?.id === c.id ? 'rgba(76,217,100,0.18)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${nationality?.id === c.id ? colors.accent : 'rgba(255,255,255,0.1)'}`,
                  color: '#fff',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                <FlagBadge countryName={c.name} width={20} />
                <span style={{ flex: 1 }}>{c.name}</span>
                {nationality?.id === c.id ? '✓' : ''}
              </button>
            ))}
            {filteredCountries.length === 0 && (
              <div style={{ color: colors.textMuted, fontSize: 13 }}>Sin resultados.</div>
            )}
          </div>
        </section>

        <section style={{ flex: '0 0 300px' }}>
          <Label>Posición</Label>
          <div
            style={{
              position: 'relative',
              width: 300,
              height: 400,
              background: 'linear-gradient(#143d22, #0e2a18)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            {POSITIONS.map((p) => (
              <button
                key={p.code}
                onClick={() => setPosition(p.code)}
                style={{
                  position: 'absolute',
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  transform: 'translate(-50%, -50%)',
                  width: 46,
                  height: 46,
                  borderRadius: '50%',
                  border: 'none',
                  background: position === p.code ? colors.accentLight : 'rgba(255,255,255,0.14)',
                  color: position === p.code ? colors.bg : '#fff',
                  fontWeight: 800,
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </section>
      </div>

      <div style={{ display: 'flex', gap: 14, marginTop: 32 }}>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            padding: '14px 34px',
            borderRadius: 999,
            background: canSubmit ? colors.accent : 'rgba(255,255,255,0.1)',
            border: 'none',
            color: canSubmit ? '#fff' : colors.textDim,
            fontWeight: 800,
            fontSize: 15,
            cursor: canSubmit ? 'pointer' : 'default',
          }}
        >
          Continuar
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
          Volver
        </button>
      </div>
    </div>
  );
}

function Label({ children }: { children: string }) {
  return (
    <div
      style={{
        fontSize: 13,
        fontWeight: 800,
        letterSpacing: 1,
        color: colors.textSecondary,
        textTransform: 'uppercase',
        marginBottom: 12,
        textAlign: 'center',
      }}
    >
      {children}
    </div>
  );
}

function FieldLabel({ children }: { children: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: colors.textMuted, marginBottom: 4, textTransform: 'uppercase' }}>
      {children}
    </div>
  );
}

function PillToggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '8px 10px',
        borderRadius: 999,
        border: active ? 'none' : '1px solid rgba(255,255,255,0.2)',
        background: active ? '#fff' : 'rgba(255,255,255,0.06)',
        color: active ? colors.bg : colors.textSecondary,
        fontWeight: 700,
        fontSize: 12,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

const inputStyle = {
  padding: '9px 12px',
  fontSize: 13,
  background: colors.surfaceRaised,
  border: '1px solid rgba(255,255,255,0.25)',
  color: '#fff',
  fontFamily: fonts.body,
  width: '100%',
  boxSizing: 'border-box' as const,
};
