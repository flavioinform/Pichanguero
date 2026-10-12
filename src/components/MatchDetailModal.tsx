import { useEffect, useState } from 'react';
import { colors, fonts } from '../theme';
import { getMatchDetail, type LiveMatch, type MatchDetail, type LineupPlayer } from '../lib/liveMatches';

function statusLabel(match: LiveMatch): string {
  if (match.status === 'IN_PLAY' || match.status === 'LIVE') return match.minute ? `${match.minute}'` : 'EN VIVO';
  if (match.status === 'PAUSED') return 'ENTRETIEMPO';
  if (match.status === 'FINISHED') return 'FINAL';
  const date = new Date(match.utcDate);
  return date.toLocaleString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function MatchDetailModal({ match, onClose }: { match: LiveMatch; onClose: () => void }) {
  const [detail, setDetail] = useState<MatchDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMatchDetail(match.id)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudo cargar el partido.');
      });
    return () => {
      cancelled = true;
    };
  }, [match.id]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 460,
          maxWidth: '92vw',
          maxHeight: '86vh',
          overflowY: 'auto',
          background: '#101012',
          border: `1px solid ${colors.accent}`,
          boxShadow: '0 0 50px rgba(47,174,76,0.3)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {match.competitionEmblem && (
              <img src={match.competitionEmblem} alt="" style={{ width: 16, height: 16, objectFit: 'contain' }} />
            )}
            <span style={{ fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {match.competition}
              {detail?.matchday ? ` · Jornada ${detail.matchday}` : ''}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 18, cursor: 'pointer', padding: 4 }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '24px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
            <TeamColumn name={match.homeTeam} crest={match.homeCrest} formation={detail?.homeFormation ?? null} />
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontFamily: fonts.display, fontSize: 36, color: '#fff' }}>
                {match.homeScore ?? '-'} : {match.awayScore ?? '-'}
              </div>
              {detail && (detail.halfTimeHome !== null || detail.halfTimeAway !== null) && (
                <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                  ({detail.halfTimeHome ?? '-'} : {detail.halfTimeAway ?? '-'} al descanso)
                </div>
              )}
              <div style={{ fontSize: 12, color: colors.accentLight, fontWeight: 700, marginTop: 6 }}>{statusLabel(match)}</div>
            </div>
            <TeamColumn name={match.awayTeam} crest={match.awayCrest} formation={detail?.awayFormation ?? null} />
          </div>

          {error && <div style={{ color: colors.danger, fontSize: 13, textAlign: 'center', marginTop: 20 }}>{error}</div>}
          {!detail && !error && (
            <div style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 20 }}>Cargando…</div>
          )}

          {detail && (
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {detail.venue && <InfoRow label="Estadio" value={detail.venue} />}
              {detail.referee && <InfoRow label="Árbitro" value={detail.referee} />}
              {detail.stage && <InfoRow label="Instancia" value={detail.stage} />}
            </div>
          )}

          {detail && (detail.homeLineup || detail.awayLineup) ? (
            hasGridData(detail.homeLineup) || hasGridData(detail.awayLineup) ? (
              <PitchView home={detail.homeLineup} away={detail.awayLineup} />
            ) : (
              <div style={{ marginTop: 24, display: 'flex', gap: 16 }}>
                <LineupList title={match.homeTeam} players={detail.homeLineup} />
                <LineupList title={match.awayTeam} players={detail.awayLineup} />
              </div>
            )
          ) : (
            detail && (
              <div style={{ fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 20 }}>
                Las alineaciones no están disponibles para este partido.
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function TeamColumn({ name, crest, formation }: { name: string; crest: string | null; formation: string | null }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: 110 }}>
      {crest && <img src={crest} alt="" style={{ width: 44, height: 44, objectFit: 'contain' }} />}
      <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', textAlign: 'center' }}>{name}</span>
      {formation && <span style={{ fontSize: 11, color: colors.textMuted }}>{formation}</span>}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
      <span style={{ color: colors.textMuted }}>{label}</span>
      <span style={{ color: '#fff', fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function hasGridData(players: LineupPlayer[] | null): boolean {
  return !!players?.some((p) => p.grid);
}

interface PositionedPlayer {
  player: LineupPlayer;
  xPct: number;
  yPct: number;
}

/** Spreads a team's players across their half of the pitch using
 * API-FOOTBALL's "row:col" grid (row 1 = goalkeeper, higher rows = further
 * forward). `attackingUp` controls which edge is the goal line, so the two
 * teams mirror each other across the halfway line like a real broadcast
 * graphic. */
function layoutTeam(players: LineupPlayer[], attackingUp: boolean): PositionedPlayer[] {
  const rows = new Map<number, LineupPlayer[]>();
  for (const p of players) {
    const [r, c] = (p.grid ?? '').split(':').map(Number);
    if (!r || !c) continue;
    if (!rows.has(r)) rows.set(r, []);
    rows.get(r)!.push(p);
  }
  const rowNumbers = [...rows.keys()].sort((a, b) => a - b);
  const maxRow = Math.max(...rowNumbers, 1);

  return rowNumbers.flatMap((r) => {
    const rowPlayers = [...rows.get(r)!].sort((a, b) => Number(a.grid!.split(':')[1]) - Number(b.grid!.split(':')[1]));
    const n = rowPlayers.length;
    const t = (r - 1) / Math.max(maxRow - 1, 1); // 0 = goalkeeper, 1 = furthest forward
    const yPct = attackingUp ? 94 - t * 44 : 6 + t * 44;
    return rowPlayers.map((player, i) => ({
      player,
      xPct: 12 + ((i + 1) / (n + 1)) * 76,
      yPct,
    }));
  });
}

function PitchView({ home, away }: { home: LineupPlayer[] | null; away: LineupPlayer[] | null }) {
  const homePositions = home ? layoutTeam(home, true) : [];
  const awayPositions = away ? layoutTeam(away, false) : [];

  return (
    <div style={{ marginTop: 24, position: 'relative', width: '100%', aspectRatio: '2 / 3', background: '#0f3b1f', overflow: 'hidden' }}>
      <svg viewBox="0 0 100 150" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <rect x={2} y={2} width={96} height={146} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={0.5} />
        <line x1={2} y1={75} x2={98} y2={75} stroke="rgba(255,255,255,0.35)" strokeWidth={0.5} />
        <circle cx={50} cy={75} r={9} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={0.5} />
        <circle cx={50} cy={75} r={0.8} fill="rgba(255,255,255,0.35)" />
        {/* top goal box (away) */}
        <rect x={25} y={2} width={50} height={16} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={0.5} />
        <rect x={38} y={2} width={24} height={6} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={0.5} />
        {/* bottom goal box (home) */}
        <rect x={25} y={132} width={50} height={16} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={0.5} />
        <rect x={38} y={142} width={24} height={6} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={0.5} />
      </svg>

      {[...awayPositions.map((p) => ({ ...p, color: colors.danger })), ...homePositions.map((p) => ({ ...p, color: colors.accentLight }))].map(
        (p, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${p.xPct}%`,
              top: `${p.yPct}%`,
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              width: 60,
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: p.color,
                color: colors.bg,
                fontSize: 11,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
                flexShrink: 0,
              }}
            >
              {p.player.shirtNumber ?? ''}
            </div>
            <span
              style={{
                fontSize: 9,
                color: '#fff',
                textAlign: 'center',
                textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 60,
              }}
            >
              {p.player.name}
            </span>
          </div>
        )
      )}
    </div>
  );
}

function LineupList({ title, players }: { title: string; players: LineupPlayer[] | null }) {
  if (!players || players.length === 0) return <div style={{ flex: 1 }} />;
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 10, color: colors.accentLight, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {players.map((p, i) => (
          <div key={i} style={{ fontSize: 12, color: '#e2e2e5', display: 'flex', gap: 6 }}>
            {p.shirtNumber !== null && <span style={{ color: colors.textMuted, width: 18 }}>{p.shirtNumber}</span>}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
