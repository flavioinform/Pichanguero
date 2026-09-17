import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { AppState } from './types';
import { useGames } from './hooks/useGames';
import { getPublicAssetUrl, LOGO_PATH } from './lib/assets';
import { BackgroundLayer } from './components/BackgroundLayer';
import { MenuScreen } from './components/MenuScreen';
import { DetailScreen } from './components/DetailScreen';
import { LoadingScreen } from './components/LoadingScreen';
import { GatoScreen } from './components/gato/GatoScreen';
import { TuttiOnlineScreen } from './components/tutti/TuttiOnlineScreen';

const logoUrl = getPublicAssetUrl(LOGO_PATH);

export default function App() {
  const { games, loading, error } = useGames();
  const [state, setState] = useState<AppState>({ screen: 'menu', selectedIndex: 0 });

  const count = games.length;

  const select = useCallback((index: number) => {
    setState((s) => ({ ...s, selectedIndex: index }));
  }, []);

  const prev = useCallback(() => {
    setState((s) => ({ ...s, selectedIndex: (s.selectedIndex - 1 + count) % count }));
  }, [count]);

  const next = useCallback(() => {
    setState((s) => ({ ...s, selectedIndex: (s.selectedIndex + 1) % count }));
  }, [count]);

  const confirm = useCallback(() => {
    setState((s) => ({ ...s, screen: 'detail' }));
  }, []);

  const backToMenu = useCallback(() => {
    setState((s) => ({ ...s, screen: 'menu' }));
  }, []);

  const startGame = useCallback(() => {
    setState((s) => {
      const game = games[s.selectedIndex];
      const screen = game?.id === 'gato' ? 'gato' : game?.id === 'tutti' ? 'tutti' : 'loading';
      return { ...s, screen };
    });
  }, [games]);

  useEffect(() => {
    if (count === 0) return;

    function onKeyDown(e: KeyboardEvent) {
      if (state.screen === 'menu') {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          next();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          prev();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          confirm();
        }
      } else if (state.screen === 'detail') {
        if (e.key === 'Escape' || e.key === 'Backspace') {
          backToMenu();
        } else if (e.key === 'Enter') {
          startGame();
        }
      } else if (state.screen === 'loading' || state.screen === 'gato' || state.screen === 'tutti') {
        if (e.key === 'Escape') {
          backToMenu();
        }
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state.screen, count, next, prev, confirm, backToMenu, startGame]);

  if (loading) {
    return (
      <div style={rootStyle}>
        <div style={{ position: 'relative', zIndex: 2, color: '#8a8a8e', fontSize: 14 }}>Cargando…</div>
      </div>
    );
  }

  if (error || count === 0) {
    return (
      <div style={rootStyle}>
        <div style={{ position: 'relative', zIndex: 2, color: '#c7c7cc', fontSize: 14, maxWidth: 480, textAlign: 'center' }}>
          No se pudieron cargar los juegos{error ? `: ${error}` : ''}.
        </div>
      </div>
    );
  }

  const selectedGame = games[state.selectedIndex];

  return (
    <div style={rootStyle}>
      <BackgroundLayer games={games} selectedIndex={state.selectedIndex} />

      {state.screen === 'menu' && (
        <MenuScreen
          games={games}
          selectedIndex={state.selectedIndex}
          logoUrl={logoUrl}
          onSelect={select}
          onPrev={prev}
          onNext={next}
          onConfirm={confirm}
        />
      )}

      {state.screen === 'detail' && <DetailScreen game={selectedGame} onBack={backToMenu} onStart={startGame} />}

      {state.screen === 'loading' && <LoadingScreen gameName={selectedGame.name} onBack={backToMenu} />}

      {state.screen === 'gato' && <GatoScreen onBack={backToMenu} />}

      {state.screen === 'tutti' && <TuttiOnlineScreen onBack={backToMenu} />}
    </div>
  );
}

const rootStyle: CSSProperties = {
  position: 'relative',
  width: '100vw',
  height: '100vh',
  overflow: 'hidden',
  background: '#0a0a0c',
  fontFamily: "'Manrope', sans-serif",
  color: '#f5f5f5',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
