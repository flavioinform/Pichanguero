import { colors, fonts } from '../../theme';
import { rankStandings, type AuctionStanding } from '../../lib/auctionEngine';
import type { Formation, Xi } from '../../lib/auctionFormations';
import { FormationPreview } from './FormationPreview';

export interface ResultStanding extends AuctionStanding {
  mine: boolean;
  xi: Xi;
}

/** Final table: ranked by total caps (tie-break: unspent budget), each with
 * the XI they put together. */
export function AuctionResult({ standings, formation }: { standings: ResultStanding[]; formation: Formation }) {
  const ranked = rankStandings(standings);

  return (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
      {ranked.map((s, i) => (
        <div
          key={s.key}
          style={{
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            background: i === 0 ? 'rgba(47,174,76,0.16)' : 'rgba(18,18,20,0.6)',
            border: `1px solid ${i === 0 ? colors.accent : 'rgba(255,255,255,0.15)'}`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, color: '#fff' }}>
            <span style={{ fontWeight: 800, textTransform: 'uppercase' }}>
              {i === 0 ? '🏆 ' : `${i + 1}. `}
              {s.mine && s.label.toLowerCase() !== 'vos' ? `${s.label} (vos)` : s.label}
            </span>
            <span style={{ fontFamily: fonts.display, fontSize: 24, color: colors.accentLight }}>{s.score} pts</span>
          </div>
          <div style={{ fontSize: 12, color: colors.textMuted }}>Sobraron {s.budgetLeft}M</div>
          <FormationPreview formation={formation} xi={s.xi} width={230} />
        </div>
      ))}
    </div>
  );
}
