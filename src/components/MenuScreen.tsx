import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Game } from '../types';
import { colors, fonts } from '../theme';
import { useViewport } from '../hooks/useViewport';
import type { ViewportSize } from '../hooks/useViewport';
import { CARD_HEIGHT, GameCard, LATERAL_CARD_WIDTH, SELECTED_CARD_WIDTH } from './GameCard';
import { NavArrow } from './NavArrow';
import { FlagshipBadge } from './FlagshipBadge';
import { LiveMatchesWidget } from './LiveMatchesWidget';

interface MenuScreenProps {
  games: Game[];
  selectedIndex: number;
  logoUrl: string;
  onSelect: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onConfirm: () => void;
}

const GALLERY_VISIBLE = 3;
const SWIPE_MIN_PX = 40;

/** Medidas del menú por tamaño de pantalla. Escritorio usa los valores originales. */
const LAYOUT: Record<
  ViewportSize,
  {
    logoHeight: number;
    logoTop: number;
    logoLeft: number;
    titleSize: number;
    descSize: number;
    titlePadding: string;
    rowPadding: string;
    rowGap: number;
    footerHeight: number;
    cardVars: Record<string, string>;
  }
> = {
  mobile: {
    logoHeight: 40,
    logoTop: 16,
    logoLeft: 16,
    titleSize: 28,
    descSize: 14,
    titlePadding: '0 16px 20px',
    rowPadding: '0 8px',
    rowGap: 4,
    footerHeight: 56,
    cardVars: {
      '--card-h': 'clamp(240px, 44vh, 380px)',
      '--card-selected-w': 'min(60vw, 260px)',
      '--card-lateral-w': 'min(44vw, 200px)',
    },
  },
  tablet: {
    logoHeight: 44,
    logoTop: 24,
    logoLeft: 28,
    titleSize: 32,
    descSize: 15,
    titlePadding: '0 28px 40px',
    rowPadding: '0 20px',
    rowGap: 12,
    footerHeight: 72,
    cardVars: {
      '--card-h': 'clamp(260px, 46vh, 420px)',
      '--card-selected-w': 'clamp(220px, 30vw, 300px)',
      '--card-lateral-w': 'clamp(200px, 26vw, 320px)',
    },
  },
  desktop: {
    logoHeight: 52,
    logoTop: 32,
    logoLeft: 48,
    titleSize: 36,
    descSize: 16,
    // El alto de las cards y el margen del título dependen del alto de la ventana
    // para que el título no choque con el logo en pantallas bajas (ej. 1366×768).
    titlePadding: '0 40px clamp(24px, 6vh, 80px)',
    rowPadding: '0 40px',
    rowGap: 22,
    footerHeight: 84,
    cardVars: { '--card-h': 'clamp(220px, 42vh, 380px)' },
  },
};

/** Distancia del juego i a la seleccion, contando en circulo (negativo = izquierda). */
function galleryOffset(i: number, selected: number, n: number): number {
  let d = i - selected;
  if (d > n / 2) d -= n;
  if (d < -n / 2) d += n;
  return d;
}

export function MenuScreen({ games, selectedIndex, logoUrl, onSelect, onPrev, onNext, onConfirm }: MenuScreenProps) {
  const selectedGame = games[selectedIndex];
  const viewport = useViewport();
  const layout = LAYOUT[viewport];
  const isMobile = viewport === 'mobile';

  function selectAndEnter(index: number) {
    onSelect(index);
    onConfirm();
  }

  const [spinning, setSpinning] = useState(false);
  const timerRef = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    },
    []
  );

  /** Gira la ruleta: recorre los juegos cada vez más lento y termina en uno al azar distinto del actual. */
  function spin() {
    const n = games.length;
    if (spinning || n < 2) return;

    const target = (selectedIndex + 1 + Math.floor(Math.random() * (n - 1))) % n;
    const total = n * 3 + ((target - selectedIndex + n) % n);
    let step = 0;
    let cur = selectedIndex;
    setSpinning(true);

    const tick = () => {
      cur = (cur + 1) % n;
      onSelect(cur);
      step++;
      if (step >= total) {
        timerRef.current = null;
        setSpinning(false);
        return;
      }
      const progress = step / total;
      timerRef.current = window.setTimeout(tick, 70 + progress * progress * 380);
    };
    timerRef.current = window.setTimeout(tick, 70);
  }

  /** En pantallas táctiles, deslizar el dedo sobre la ruleta cambia de juego. */
  function onTouchEnd(endX: number) {
    const startX = touchStartX.current;
    touchStartX.current = null;
    if (startX === null || spinning) return;
    const dx = endX - startX;
    if (Math.abs(dx) < SWIPE_MIN_PX) return;
    if (dx < 0) onNext();
    else onPrev();
  }

  const rootStyle: CSSProperties = {
    position: 'relative',
    zIndex: 2,
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    ...(layout.cardVars as CSSProperties),
  };

  return (
    <div style={rootStyle}>
      <div style={{ position: 'absolute', top: layout.logoTop, left: layout.logoLeft }}>
        <img src={logoUrl} alt="Pichanguero" style={{ height: layout.logoHeight, width: 'auto', display: 'block' }} />
      </div>

      {viewport === 'desktop' && <LiveMatchesWidget />}

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 0 22px 0' }}>
        <div style={{ padding: layout.titlePadding, boxSizing: 'border-box', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
          <div style={{ minWidth: 0 }}>
          {selectedGame.isFlagship && <FlagshipBadge style={{ marginBottom: 10 }} />}
          <h1
            style={{
              fontFamily: fonts.display,
              fontSize: layout.titleSize,
              lineHeight: 1,
              margin: '0 0 10px 0',
              textTransform: 'uppercase',
              color: '#fff',
              textShadow: '0 2px 18px rgba(0,0,0,0.6)',
            }}
          >
            {selectedGame.name}
          </h1>
          <p style={{ fontSize: layout.descSize, lineHeight: 1.5, color: colors.textSecondary, margin: 0, maxWidth: 620 }}>
            {selectedGame.shortDesc}
          </p>
          <button
            onClick={spin}
            disabled={spinning}
            style={{
              marginTop: 20,
              padding: '10px 22px',
              background: spinning ? 'rgba(10,10,12,0.5)' : 'rgba(10,10,12,0.8)',
              border: `1px solid ${colors.accent}`,
              color: spinning ? colors.textMuted : '#fff',
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: 1,
              textTransform: 'uppercase',
              cursor: spinning ? 'default' : 'pointer',
            }}
          >
            {spinning ? 'Girando…' : 'Girar la ruleta'}
          </button>
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.18)', width: '100%' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: layout.rowGap, width: '100%', padding: layout.rowPadding, boxSizing: 'border-box' }}>
          {!isMobile && <NavArrow direction="prev" onClick={onPrev} />}

          <div
            onTouchStart={(e) => {
              touchStartX.current = e.touches[0].clientX;
            }}
            onTouchEnd={(e) => onTouchEnd(e.changedTouches[0].clientX)}
            style={{ position: 'relative', flex: 1, minWidth: 0, height: CARD_HEIGHT, perspective: 1200, touchAction: 'pan-y' }}
          >
            {games.map((game, i) => {
              const d = galleryOffset(i, selectedIndex, games.length);
              const dist = Math.abs(d);
              const side = Math.sign(d);
              const visible = dist <= GALLERY_VISIBLE;
              const x =
                dist === 0
                  ? '0px'
                  : `calc(${side} * (${SELECTED_CARD_WIDTH} / 2 + ${LATERAL_CARD_WIDTH} / 2 + 20px + (${LATERAL_CARD_WIDTH} * ${0.55 * (dist - 1)})))`;
              const z = -dist * 140;
              const rotY = dist === 0 ? 0 : -side * 40;

              return (
                <div
                  key={game.id}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: `translate(-50%, -50%) translateX(${x}) translateZ(${z}px) rotateY(${rotY}deg)`,
                    opacity: visible ? (dist === 0 ? 1 : 0.85 - dist * 0.2) : 0,
                    zIndex: 10 - dist,
                    pointerEvents: visible ? 'auto' : 'none',
                    transition: 'transform 0.6s ease, opacity 0.6s ease',
                  }}
                >
                  {dist === 0 ? (
                    <GameCard
                      variant="selected"
                      iconKey={game.iconKey}
                      ariaLabel={`Entrar a ${game.name}`}
                      onClick={onConfirm}
                    />
                  ) : (
                    <GameCard
                      variant="lateral"
                      iconKey={game.iconKey}
                      ariaLabel={`Entrar a ${game.name}`}
                      onClick={() => selectAndEnter(i)}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {!isMobile && <NavArrow direction="next" onClick={onNext} />}
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          flexShrink: 0,
          height: `calc(${layout.footerHeight}px + env(safe-area-inset-bottom))`,
          background: 'linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.55))',
          borderTop: '1px solid rgba(47,174,76,0.4)',
          display: 'flex',
          alignItems: 'center',
          padding: isMobile ? '0 12px' : '0 40px',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {!isMobile && (
          <div style={{ color: colors.textFooter, fontSize: 13, letterSpacing: 0.5 }}>Pichanguero · v0.1.0</div>
        )}
      </div>
    </div>
  );
}
