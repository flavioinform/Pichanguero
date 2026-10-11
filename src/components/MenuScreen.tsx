import type { Game } from '../types';
import { colors, fonts } from '../theme';
import { AdSlot } from './AdSlot';
import { GameCard } from './GameCard';
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

export function MenuScreen({ games, selectedIndex, logoUrl, onSelect, onPrev, onNext, onConfirm }: MenuScreenProps) {
  const selectedGame = games[selectedIndex];

  function selectAndEnter(index: number) {
    onSelect(index);
    onConfirm();
  }

  return (
    <div style={{ position: 'relative', zIndex: 2, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'absolute', top: 32, left: 48 }}>
        <img src={logoUrl} alt="Pichanguero" style={{ height: 52, width: 'auto', display: 'block' }} />
      </div>

      <AdSlot
        label="Espacio publicitario"
        style={{ position: 'absolute', top: 28, right: 48, width: 260, height: 60 }}
      />

      <LiveMatchesWidget />

      <div style={{ flexShrink: 0, marginTop: 'clamp(84px, 13vh, 110px)', paddingLeft: 64, maxWidth: 600 }}>
        {selectedGame.isFlagship && <FlagshipBadge style={{ marginBottom: 14 }} />}
        <h1
          style={{
            fontFamily: fonts.display,
            fontSize: 58,
            lineHeight: 1,
            margin: '0 0 14px 0',
            textTransform: 'uppercase',
            color: '#fff',
            textShadow: '0 2px 18px rgba(0,0,0,0.6)',
          }}
        >
          {selectedGame.name}
        </h1>
        <p style={{ fontSize: 18, lineHeight: 1.5, color: colors.textSecondary, margin: 0, maxWidth: 520 }}>
          {selectedGame.shortDesc}
        </p>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 0 22px 0' }}>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.18)', width: '100%' }} />
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 22, width: '100%', padding: '0 40px', boxSizing: 'border-box' }}>
          <NavArrow direction="prev" onClick={onPrev} />

          <GameCard
            variant="selected"
            iconKey={selectedGame.iconKey}
            ariaLabel={`Entrar a ${selectedGame.name}`}
            onClick={onConfirm}
          />

          {games.map((game, i) =>
            i === selectedIndex ? null : (
              <GameCard
                key={game.id}
                variant="lateral"
                iconKey={game.iconKey}
                ariaLabel={`Entrar a ${game.name}`}
                onClick={() => selectAndEnter(i)}
              />
            )
          )}

          <div style={{ flex: 1 }} />

          <NavArrow direction="next" onClick={onNext} />
        </div>
      </div>

      <AdSlot
        label="Banner publicitario"
        style={{ flexShrink: 0, height: 64, margin: '0 40px' }}
        borderOpacity={0.3}
        bgOpacity={0.3}
        textOpacity={0.4}
        fontSize={12}
      />

      <div
        style={{
          position: 'relative',
          flexShrink: 0,
          height: 84,
          background: 'linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.55))',
          borderTop: '1px solid rgba(47,174,76,0.4)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 40px',
        }}
      >
        <div style={{ color: colors.textFooter, fontSize: 13, letterSpacing: 0.5 }}>Pichanguero · v0.1.0</div>
      </div>
    </div>
  );
}
