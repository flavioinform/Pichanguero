import type { ReactNode } from 'react';
import { colors, fonts } from '../../theme';
import { FORMATIONS, getFormation, lotsPerGroup } from '../../lib/auctionFormations';
import { AUCTION } from '../../config/gameConfig';

interface AuctionSettingsProps {
  budget: number;
  formationId: string;
  lotsMode: 'full' | 'short';
  /** how many people are bidding, to size the match (2 for vs CPU) */
  participants: number;
  onBudgetChange: (budget: number) => void;
  onFormationChange: (id: string) => void;
  onLotsModeChange: (mode: 'full' | 'short') => void;
}

/** Formation, budget (presets or any value from 10 to 1000) and match
 * length — shared by the offline setup and the online room config. */
export function AuctionSettings({
  budget,
  formationId,
  lotsMode,
  participants,
  onBudgetChange,
  onFormationChange,
  onLotsModeChange,
}: AuctionSettingsProps) {
  const formation = getFormation(formationId);
  const lots = Object.values(lotsPerGroup(formation, participants, lotsMode)).reduce((a, b) => a + b, 0);
  const minutes = Math.round((lots * (AUCTION.bidWindowMs + AUCTION.revealMs)) / 60000);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22, alignItems: 'center', width: '100%' }}>
      <Group label="Formación">
        {FORMATIONS.map((f) => (
          <Pill key={f.id} selected={f.id === formationId} onClick={() => onFormationChange(f.id)}>
            {f.id}
          </Pill>
        ))}
      </Group>

      <Group label="Presupuesto de cada jugador (millones)" hint={`Elegí uno o escribí el tuyo (${AUCTION.budgetMin} a ${AUCTION.budgetMax})`}>
        {AUCTION.budgetPresets.map((preset) => (
          <Pill key={preset} selected={preset === budget} onClick={() => onBudgetChange(preset)}>
            {`${preset}M`}
          </Pill>
        ))}
        <input
          type="number"
          aria-label="Presupuesto personalizado"
          min={AUCTION.budgetMin}
          max={AUCTION.budgetMax}
          value={budget}
          onChange={(e) => {
            const n = Math.round(Number(e.target.value));
            if (Number.isFinite(n)) onBudgetChange(Math.max(1, Math.min(AUCTION.budgetMax, n)));
          }}
          onBlur={() => onBudgetChange(Math.max(AUCTION.budgetMin, Math.min(AUCTION.budgetMax, budget)))}
          style={{
            width: 90,
            padding: '0 10px',
            background: colors.surfaceRaised,
            border: `1px solid ${AUCTION.budgetPresets.includes(budget) ? 'rgba(255,255,255,0.25)' : colors.accent}`,
            color: '#fff',
            fontFamily: fonts.display,
            fontSize: 16,
            textAlign: 'center',
          }}
        />
      </Group>

      <Group label="Duración" hint={`${lots} jugadores a subastar · unos ${minutes} min`}>
        <Pill selected={lotsMode === 'full'} onClick={() => onLotsModeChange('full')}>
          Once completo
        </Pill>
        <Pill selected={lotsMode === 'short'} onClick={() => onLotsModeChange('short')}>
          Rápida
        </Pill>
      </Group>
    </div>
  );
}

function Group({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
      <span style={{ fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 700 }}>
        {label}
      </span>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>{children}</div>
      {hint && <span style={{ fontSize: 11, color: colors.textMuted }}>{hint}</span>}
    </div>
  );
}

function Pill({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        minWidth: 56,
        height: 42,
        padding: '0 14px',
        background: selected ? colors.accent : 'rgba(18,18,20,0.7)',
        border: `1px solid ${selected ? colors.accent : 'rgba(255,255,255,0.25)'}`,
        color: '#fff',
        fontFamily: fonts.display,
        fontSize: 16,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}
