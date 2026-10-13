import { colors, fonts } from '../../theme';
import { useViewport } from '../../hooks/useViewport';
import type { CareerPlayerState } from '../../lib/careerTypes';
import { CAREER } from '../../config/gameConfig';
import { ClubCrest } from './ClubCrest';
import { FlagBadge } from './FlagBadge';
import { PlayerAvatar } from './PlayerAvatar';
import { TrophyIcon } from './TrophyIcon';

interface CareerDashboardScreenProps {
  state: CareerPlayerState;
  onSimulate: () => void;
  onRequestTransfer: () => void;
  onRequestLoan: () => void;
  onBack: () => void;
  simulating: boolean;
}

export function CareerDashboardScreen({
  state,
  onSimulate,
  onRequestTransfer,
  onRequestLoan,
  onBack,
  simulating,
}: CareerDashboardScreenProps) {
  const viewport = useViewport();
  const mobile = viewport === 'mobile';
  const canRequest = state.status === 'contratado' && !state.loanParentClubId && !simulating;
  const seasonByAge = new Map(state.seasons.map((s) => [s.age, s]));
  const ages = Array.from({ length: CAREER.retirementAge - CAREER.startAge + 1 }, (_, i) => CAREER.startAge + i);

  return (
    <div style={{ position: 'relative', zIndex: 2, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: mobile ? '16px' : viewport === 'tablet' ? '24px 28px' : '28px 48px' }}>
      <div style={{ flex: mobile ? 'none' : 1, display: 'flex', flexDirection: mobile ? 'column' : 'row', gap: mobile ? 20 : 32, minHeight: mobile ? undefined : 0 }}>
        <PlayerCard state={state} fullWidth={mobile} />

        <div style={{ flex: mobile ? 'none' : 1, height: mobile ? 360 : undefined, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 50px 40px 40px 40px', fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, padding: '0 10px 8px', fontWeight: 700 }}>
            <span>Edad</span>
            <span>Club</span>
            <span>OVR</span>
            <span>PJ</span>
            <span>GLS</span>
            <span>AST</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', border: '1px solid rgba(255,255,255,0.08)' }}>
            {ages.map((age) => {
              const s = seasonByAge.get(age);
              const isCurrent = age === state.age && !s;
              return (
                <div
                  key={age}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '50px 1fr 50px 40px 40px 40px',
                    alignItems: 'center',
                    padding: '7px 10px',
                    fontSize: 13,
                    color: s ? '#fff' : isCurrent ? colors.accentLight : colors.textDim,
                    background: isCurrent ? 'rgba(47,174,76,0.12)' : 'transparent',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  <span>{age}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                    {s?.clubName && <ClubCrest clubId={s.clubId} name={s.clubName} size={18} />}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s ? s.clubName ?? 'Libre' : isCurrent ? 'Eligiendo club…' : '—'}
                    </span>
                  </span>
                  <span>{s ? s.ovr : isCurrent ? state.ovr : '—'}</span>
                  <span>{s ? s.pj : '—'}</span>
                  <span>{s ? s.gls : '—'}</span>
                  <span>{s ? s.ast : '—'}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: mobile ? 10 : 14, marginTop: 20, justifyContent: 'center' }}>
        <button
          onClick={onSimulate}
          disabled={simulating}
          style={{
            padding: '14px 36px',
            borderRadius: 999,
            background: simulating ? 'rgba(255,255,255,0.1)' : colors.accent,
            border: 'none',
            color: simulating ? colors.textDim : '#fff',
            fontWeight: 800,
            fontSize: 15,
            cursor: simulating ? 'default' : 'pointer',
          }}
        >
          {simulating ? 'Simulando…' : 'Simular temporada'}
        </button>
        <button
          onClick={onRequestTransfer}
          disabled={!canRequest}
          title={canRequest ? undefined : 'Solo disponible mientras estás contratado'}
          style={{
            padding: '14px 24px',
            borderRadius: 999,
            background: 'none',
            border: `1px solid ${canRequest ? 'rgba(76,217,100,0.5)' : 'rgba(255,255,255,0.12)'}`,
            color: canRequest ? colors.accentLight : colors.textDim,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 0.5,
            cursor: canRequest ? 'pointer' : 'default',
            textTransform: 'uppercase',
          }}
        >
          Pedir salida
        </button>
        <button
          onClick={onRequestLoan}
          disabled={!canRequest}
          title={canRequest ? undefined : 'Solo disponible mientras estás contratado'}
          style={{
            padding: '14px 24px',
            borderRadius: 999,
            background: 'none',
            border: `1px solid ${canRequest ? 'rgba(76,217,100,0.5)' : 'rgba(255,255,255,0.12)'}`,
            color: canRequest ? colors.accentLight : colors.textDim,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 0.5,
            cursor: canRequest ? 'pointer' : 'default',
            textTransform: 'uppercase',
          }}
        >
          Pedir préstamo
        </button>
        <button
          onClick={onBack}
          style={{
            padding: '14px 24px',
            borderRadius: 999,
            background: 'none',
            border: '1px solid rgba(255,255,255,0.25)',
            color: colors.textSecondary,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 0.5,
            cursor: 'pointer',
            textTransform: 'uppercase',
          }}
        >
          Salir
        </button>
      </div>
    </div>
  );
}

function PlayerCard({ state, fullWidth }: { state: CareerPlayerState; fullWidth: boolean }) {
  return (
    <div style={{ width: fullWidth ? '100%' : 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <PlayerAvatar imageUrl={state.avatarImageUrl} lastName={state.identity.lastName} size={64} />
          <div
            style={{
              position: 'absolute',
              bottom: -6,
              right: -6,
              width: 30,
              height: 30,
              borderRadius: 8,
              background: 'linear-gradient(160deg, #ffb238, #c9780f)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: fonts.display,
              fontSize: 13,
              color: '#2a1600',
              boxShadow: '0 2px 8px rgba(201,120,15,0.4)',
              border: '2px solid #0a0a0c',
            }}
          >
            {state.ovr}
          </div>
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: colors.accentLight }}>
            <FlagBadge countryName={state.identity.nationality.name} width={40} />
            <span>#{state.identity.number}</span>
            <span>{state.identity.position}</span>
          </div>
          <div style={{ fontFamily: fonts.display, fontSize: 18, color: '#fff' }}>{state.identity.lastName}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: colors.textSecondary }}>
        {state.currentClubName && (
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 7,
              background: '#f2f2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ClubCrest clubId={state.currentClubId} name={state.currentClubName} size={22} />
          </div>
        )}
        <span>
          {state.status === 'libre' ? 'Libre' : state.currentClubName ?? 'Libre'}
          {state.loanParentClubId && (
            <span style={{ color: colors.textMuted }}> · a préstamo de {state.loanParentClubName}</span>
          )}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 20 }}>
        <MiniStat label="Edad" value={state.age} />
        <MiniStat label="Valor" value={formatValue(state.valueEUR)} />
      </div>

      <div style={{ display: 'flex', gap: 18 }}>
        <MiniStat label="PJ" value={state.careerTotals.pj} />
        <MiniStat label="GLS" value={state.careerTotals.gls} />
        <MiniStat label="AST" value={state.careerTotals.ast} />
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 6 }}>
          Vitrina
        </div>
        {state.trophies.length === 0 ? (
          <div style={{ fontSize: 12, color: colors.textDim }}>Vitrina vacía</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {state.trophies.slice(-4).map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: colors.accentLight }}>
                <TrophyIcon tier={t.tier} size={14} />
                {t.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div style={{ fontFamily: fonts.display, fontSize: 18, color: '#fff' }}>{value}</div>
      <div style={{ fontSize: 10, color: colors.textMuted, textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
}

function formatValue(eur: number): string {
  if (eur >= 1_000_000) return `€${(eur / 1_000_000).toFixed(1)}M`;
  if (eur >= 1_000) return `€${Math.round(eur / 1000)}K`;
  return `€${eur}`;
}
