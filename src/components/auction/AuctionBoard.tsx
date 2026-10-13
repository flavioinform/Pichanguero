import { useState } from 'react';
import type { CSSProperties } from 'react';
import { colors, fonts } from '../../theme';
import { bidSteps, buildClues, cluesRevealed, type AuctionLot } from '../../lib/auctionEngine';
import { GROUP_LABEL, groupOf, type Formation, type Xi } from '../../lib/auctionFormations';
import { FormationPreview } from './FormationPreview';
import { SecondaryButton } from './auctionUi';
import { AUCTION } from '../../config/gameConfig';

export interface BoardBid {
  label: string;
  amount: number;
  mine: boolean;
}

export interface BoardStanding {
  key: string;
  label: string;
  budgetLeft: number;
  score: number;
  mine: boolean;
  xi: Xi;
}

export interface BoardReveal {
  winnerLabel: string | null;
  winnerMine: boolean;
  price: number;
  caps: number;
}

interface AuctionBoardProps {
  phase: 'bidding' | 'reveal';
  round: number;
  roundsTotal: number;
  lot: AuctionLot | null;
  formation: Formation;
  elapsedMs: number;
  topBid: BoardBid | null;
  recentBids: BoardBid[];
  myBudget: number;
  budgetTotal: number;
  standings: BoardStanding[];
  /** false when the player already filled every slot of this lot's position */
  hasSlot: boolean;
  onBid: (amount: number) => void;
  bidError?: string | null;
  reveal: BoardReveal | null;
  revealCountdown?: number | null;
  onNext?: (() => void) | null;
  onExit: () => void;
}

function silhouetteFilter(cluesShown: number): string {
  const blur = AUCTION.silhouetteBlurPx[Math.min(AUCTION.silhouetteBlurPx.length, Math.max(1, cluesShown)) - 1];
  return `grayscale(1) brightness(0.55) contrast(1.9) blur(${blur}px)`;
}

export function AuctionBoard({
  phase,
  round,
  roundsTotal,
  lot,
  formation,
  elapsedMs,
  topBid,
  recentBids,
  myBudget,
  budgetTotal,
  standings,
  hasSlot,
  onBid,
  bidError,
  reveal,
  revealCountdown,
  onNext,
  onExit,
}: AuctionBoardProps) {
  const [viewKey, setViewKey] = useState<string | null>(null);
  const [failedImageId, setFailedImageId] = useState<number | null>(null);

  const bidding = phase === 'bidding';
  const secondsLeft = Math.max(0, Math.ceil((AUCTION.bidWindowMs - elapsedMs) / 1000));
  const progress = Math.min(1, elapsedMs / AUCTION.bidWindowMs);
  const clues = lot ? buildClues(lot) : [];
  const revealedCount = bidding ? cluesRevealed(elapsedMs) : clues.length;
  const group = groupOf(lot?.position ?? null);

  const viewed = standings.find((s) => s.key === viewKey) ?? standings.find((s) => s.mine) ?? standings[0];

  const base = topBid?.amount ?? 0;
  const [small, mid, big] = bidSteps(budgetTotal);
  const iAmTop = topBid?.mine ?? false;
  const canBid = bidding && hasSlot && !iAmTop && elapsedMs < AUCTION.bidWindowMs;
  const options = [
    { label: `+${small}`, amount: base + small },
    { label: `+${mid}`, amount: base + mid },
    { label: `+${big}`, amount: base + big },
    { label: 'Todo', amount: myBudget },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', maxWidth: 1180, padding: '16px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: fonts.display, fontSize: 22, color: '#fff', textTransform: 'uppercase' }}>
          Lote {round} <span style={{ color: colors.textMuted }}>/ {roundsTotal}</span>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {standings.map((s) => (
            <div
              key={s.key}
              style={{
                padding: '6px 12px',
                background: s.mine ? 'rgba(47,174,76,0.18)' : 'rgba(12,12,14,0.85)',
                border: `1px solid ${s.mine ? colors.accent : 'rgba(255,255,255,0.15)'}`,
                fontSize: 12,
                color: '#fff',
                display: 'flex',
                gap: 10,
                alignItems: 'baseline',
              }}
            >
              <strong style={{ textTransform: 'uppercase' }}>{s.label}</strong>
              <span style={{ color: colors.accentLight }}>{s.budgetLeft}M</span>
              <span style={{ color: colors.textMuted }}>{s.score} pts</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={{ ...panelStyle, width: 230, flexShrink: 0, alignItems: 'center', padding: 12, gap: 10 }}>
          {group && (
            <div
              style={{
                alignSelf: 'stretch',
                textAlign: 'center',
                padding: '4px 8px',
                fontSize: 11,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                color: hasSlot ? colors.accentLight : colors.textMuted,
                background: hasSlot ? 'rgba(47,174,76,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${hasSlot ? 'rgba(47,174,76,0.5)' : 'rgba(255,255,255,0.12)'}`,
              }}
            >
              Se subasta: {GROUP_LABEL[group]}
            </div>
          )}
          <div
            style={{
              position: 'relative',
              width: 206,
              height: 230,
              background: 'radial-gradient(circle at 50% 35%, #2a3a2f 0%, #0c0e0d 75%)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {lot?.imageUrl && failedImageId !== lot.id ? (
              <img
                src={lot.imageUrl}
                onError={() => setFailedImageId(lot.id)}
                alt={bidding ? 'Jugador misterioso' : lot.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center 20%',
                  filter: bidding ? silhouetteFilter(revealedCount) : 'none',
                  transition: 'filter 0.8s ease',
                }}
              />
            ) : (
              <span style={{ fontFamily: fonts.display, fontSize: 90, color: colors.textMuted }}>?</span>
            )}
          </div>
          <div style={{ fontFamily: fonts.display, fontSize: 19, textTransform: 'uppercase', textAlign: 'center', color: '#fff', minHeight: 24 }}>
            {bidding ? '¿Quién es?' : lot?.name}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, minWidth: 'min(300px, 100%)', maxWidth: 520 }}>
          <div style={{ ...panelStyle, gap: 8, padding: 12 }}>
            {clues.map((clue, i) => {
              const shown = i < revealedCount;
              const untilMs = AUCTION.clueAtMs[i] - elapsedMs;
              return (
                <div
                  key={clue.label}
                  style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'baseline',
                    padding: '7px 12px',
                    background: shown ? 'rgba(47,174,76,0.1)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${shown ? 'rgba(47,174,76,0.45)' : 'rgba(255,255,255,0.08)'}`,
                    opacity: shown ? 1 : 0.55,
                  }}
                >
                  <span style={{ width: 86, flexShrink: 0, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.6, color: colors.accentLight }}>
                    {clue.label}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: shown ? '#fff' : colors.textMuted }}>
                    {shown ? clue.text : `Pista en ${Math.max(1, Math.ceil(untilMs / 1000))}s`}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ ...panelStyle, gap: 12, padding: 14 }}>
            {bidding ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={labelStyle}>Puja más alta</div>
                    <div style={{ fontFamily: fonts.display, fontSize: 28, color: topBid ? colors.accentLight : colors.textMuted }}>
                      {topBid ? `${topBid.amount}M` : 'Sin pujas'}
                      {topBid && (
                        <span style={{ fontFamily: fonts.body, fontSize: 13, color: '#fff', marginLeft: 10 }}>
                          {topBid.mine ? 'Vos' : topBid.label}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={labelStyle}>Tu presupuesto</div>
                    <div style={{ fontFamily: fonts.display, fontSize: 28, color: '#fff' }}>{myBudget}M</div>
                  </div>
                </div>

                <div style={{ height: 6, background: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${(1 - progress) * 100}%`,
                      background: secondsLeft <= 5 ? colors.danger : colors.accent,
                      transition: 'width 0.25s linear',
                    }}
                  />
                </div>
                <div style={{ textAlign: 'center', fontSize: 12, color: secondsLeft <= 5 ? colors.danger : colors.textSecondary, fontWeight: 700 }}>
                  {secondsLeft}s para cerrar la puja
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  {options.map((o) => {
                    const disabled = !canBid || o.amount > myBudget || o.amount <= base;
                    return (
                      <button
                        key={o.label}
                        disabled={disabled}
                        onClick={() => onBid(o.amount)}
                        style={{
                          flex: 1,
                          padding: '12px 8px',
                          background: disabled ? 'rgba(255,255,255,0.05)' : colors.accent,
                          border: 'none',
                          color: disabled ? colors.textMuted : '#fff',
                          fontWeight: 800,
                          fontSize: 15,
                          cursor: disabled ? 'default' : 'pointer',
                        }}
                      >
                        {o.label}
                        <div style={{ fontSize: 10, fontWeight: 600, opacity: 0.85 }}>→ {o.amount}M</div>
                      </button>
                    );
                  })}
                </div>
                {!hasSlot && group && (
                  <div style={{ textAlign: 'center', fontSize: 12, color: colors.warning }}>
                    Ya tenés cubiertos los puestos de {GROUP_LABEL[group].toLowerCase()} en tu once.
                  </div>
                )}
                {hasSlot && iAmTop && <div style={{ textAlign: 'center', fontSize: 12, color: colors.accentLight }}>Vas ganando. Esperá a que te superen.</div>}
                {bidError && <div style={{ textAlign: 'center', fontSize: 12, color: colors.danger }}>{bidError}</div>}

                {recentBids.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {recentBids.map((b, i) => (
                      <span
                        key={`${b.amount}-${i}`}
                        style={{
                          fontSize: 11,
                          padding: '3px 8px',
                          background: 'rgba(255,255,255,0.06)',
                          color: b.mine ? colors.accentLight : colors.textSecondary,
                        }}
                      >
                        {b.mine ? 'Vos' : b.label}: {b.amount}M
                      </span>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <RevealPanel reveal={reveal} countdown={revealCountdown ?? null} onNext={onNext ?? null} />
            )}
          </div>
        </div>

        <div style={{ ...panelStyle, padding: 12, gap: 10, flexShrink: 0 }}>
          {standings.length > 1 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {standings.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setViewKey(s.key)}
                  style={{
                    padding: '4px 10px',
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    background: s.key === viewed.key ? colors.accent : 'transparent',
                    border: `1px solid ${s.key === viewed.key ? colors.accent : 'rgba(255,255,255,0.25)'}`,
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  {s.mine ? 'Tu once' : s.label}
                </button>
              ))}
            </div>
          )}
          {standings.length === 1 && (
            <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: '#fff' }}>Tu once</div>
          )}
          <FormationPreview
            formation={formation}
            xi={viewed.xi}
            highlightGroup={bidding && viewed.mine && hasSlot ? group : null}
            width={250}
          />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <SecondaryButton label="Salir" onClick={onExit} />
      </div>
    </div>
  );
}

function RevealPanel({ reveal, countdown, onNext }: { reveal: BoardReveal | null; countdown: number | null; onNext: (() => void) | null }) {
  if (!reveal) {
    return (
      <div style={{ textAlign: 'center', padding: '14px 0', fontFamily: fonts.display, fontSize: 22, textTransform: 'uppercase', color: colors.textSecondary }}>
        Contando las pujas…
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '6px 0' }}>
      {reveal.winnerLabel ? (
        <>
          <div style={{ fontFamily: fonts.display, fontSize: 26, textTransform: 'uppercase', color: reveal.winnerMine ? colors.accentLight : '#fff', textAlign: 'center' }}>
            {reveal.winnerMine ? '¡Entra a tu once!' : `Se lo llevó ${reveal.winnerLabel}`}
          </div>
          <div style={{ fontSize: 15, color: colors.textSecondary, textAlign: 'center' }}>
            Por <strong style={{ color: '#fff' }}>{reveal.price}M</strong> · suma <strong style={{ color: colors.accentLight }}>{reveal.caps} pts</strong> (partidos en su selección)
          </div>
        </>
      ) : (
        <>
          <div style={{ fontFamily: fonts.display, fontSize: 26, textTransform: 'uppercase', color: colors.textSecondary }}>Nadie pujó</div>
          <div style={{ fontSize: 14, color: colors.textMuted }}>El jugador quedó sin vender.</div>
        </>
      )}
      {onNext ? (
        <button
          onClick={onNext}
          style={{
            marginTop: 6,
            padding: '12px 30px',
            background: colors.accent,
            border: 'none',
            color: '#fff',
            fontWeight: 800,
            fontSize: 14,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          Siguiente lote{countdown !== null ? ` (${countdown})` : ''}
        </button>
      ) : (
        <div style={{ fontSize: 12, color: colors.textMuted }}>Esperando al anfitrión…</div>
      )}
    </div>
  );
}

const panelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  background: colors.surface,
  border: '1px solid rgba(255,255,255,0.12)',
};

const labelStyle: CSSProperties = {
  fontSize: 10,
  fontWeight: 800,
  color: colors.textMuted,
  textTransform: 'uppercase',
  letterSpacing: 0.8,
};
