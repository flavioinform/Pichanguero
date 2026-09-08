import type { Game } from '../types';

interface BackgroundLayerProps {
  games: Game[];
  selectedIndex: number;
}

export function BackgroundLayer({ games, selectedIndex }: BackgroundLayerProps) {
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        {games.map((game, i) => (
          <div
            key={game.id}
            style={{
              position: 'absolute',
              inset: 0,
              opacity: i === selectedIndex ? 1 : 0,
              pointerEvents: i === selectedIndex ? 'auto' : 'none',
              transition: 'opacity 0.6s ease',
            }}
          >
            <img
              src={game.bgImageUrl}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
        ))}
      </div>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'none',
          background:
            'linear-gradient(105deg, rgba(4,4,5,0.97) 0%, rgba(4,4,5,0.9) 30%, rgba(4,4,5,0.55) 52%, rgba(4,4,5,0.4) 70%, rgba(4,4,5,0.6) 100%), linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 68%, rgba(0,0,0,0.92) 100%)',
        }}
      />
    </>
  );
}
