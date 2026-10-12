import { useState } from 'react';
import { colors, fonts } from '../theme';
import { useLiveMatches } from '../hooks/useLiveMatches';
import { MatchDetailModal } from './MatchDetailModal';
import type { LiveMatch } from '../lib/liveMatches';

const LIVE_STATUSES = new Set(['LIVE', 'IN_PLAY', 'PAUSED']);

function statusLabel(match: LiveMatch): string {
  if (match.status === 'IN_PLAY' || match.status === 'LIVE') return match.minute ? `${match.minute}'` : 'EN VIVO';
  if (match.status === 'PAUSED') return 'ENTRETIEMPO';
  if (match.status === 'FINISHED') return 'FINAL';

  const date = new Date(match.utcDate);
  const isToday = date.toDateString() === new Date().toDateString();
  const time = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return time;
  return `${date.toLocaleDateString('es-AR', { weekday: 'short' })} ${time}`;
}

export function LiveMatchesWidget() {
  const { matches, loading } = useLiveMatches();
  const [selected, setSelected] = useState<LiveMatch | null>(null);

  if (loading || matches.length === 0) return null;

  const hasLive = matches.some((m) => LIVE_STATUSES.has(m.status));
  const shown = matches.slice(0, 3);

  return (
    <div
      style={{
        position: 'absolute',
        top: 40,
        right: 48,
        width: 260,
        background: 'rgba(10,10,12,0.75)',
        border: '1px solid rgba(255,255,255,0.15)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          padding: '9px 12px',
          borderBottom: `1px solid ${hasLive ? 'rgba(224,90,90,0.3)' : 'rgba(255,255,255,0.12)'}`,
        }}
      >
        {hasLive && (
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: colors.danger,
              boxShadow: `0 0 6px ${colors.danger}`,
            }}
          />
        )}
        <span
          style={{
            fontFamily: fonts.display,
            fontSize: 12,
            letterSpacing: 1,
            color: hasLive ? colors.danger : colors.accentLight,
          }}
        >
          {hasLive ? 'EN VIVO' : 'PRÓXIMOS PARTIDOS'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {shown.map((match, i) => (
          <div
            key={match.id}
            onClick={() => setSelected(match)}
            role="button"
            tabIndex={0}
            style={{
              padding: '10px 12px',
              borderBottom: i < shown.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                marginBottom: 7,
              }}
            >
              {match.competitionEmblem && (
                <img src={match.competitionEmblem} alt="" style={{ width: 12, height: 12, objectFit: 'contain' }} />
              )}
              <span style={{ fontSize: 9, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                {match.competition}
              </span>
            </div>

            <TeamRow name={match.homeTeam} crest={match.homeCrest} score={match.homeScore} />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '3px 0',
              }}
            >
              <div style={{ flex: 1, borderTop: '1px solid rgba(255,255,255,0.08)' }} />
              <span style={{ fontSize: 9, fontWeight: 800, color: colors.textMuted, letterSpacing: 0.5 }}>VS</span>
              <div style={{ flex: 1, borderTop: '1px solid rgba(255,255,255,0.08)' }} />
            </div>
            <TeamRow name={match.awayTeam} crest={match.awayCrest} score={match.awayScore} />

            <div style={{ fontSize: 10, color: colors.textMuted, textAlign: 'center', marginTop: 6 }}>
              {statusLabel(match)}
            </div>
          </div>
        ))}
      </div>

      {selected && <MatchDetailModal match={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function TeamRow({ name, crest, score }: { name: string; crest: string | null; score: number | null }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {crest ? (
        <img src={crest} alt="" style={{ width: 20, height: 20, objectFit: 'contain', flexShrink: 0 }} />
      ) : (
        <div style={{ width: 20, height: 20, flexShrink: 0 }} />
      )}
      <span
        style={{
          flex: 1,
          fontSize: 13,
          fontWeight: 700,
          color: '#fff',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {name}
      </span>
      <span style={{ fontFamily: fonts.display, fontSize: 15, color: colors.accentLight, flexShrink: 0 }}>
        {score ?? '-'}
      </span>
    </div>
  );
}
