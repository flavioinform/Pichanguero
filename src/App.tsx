import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { AppState } from './types';
import { useGames } from './hooks/useGames';
import { getPublicAssetUrl, LOGO_PATH } from './lib/assets';
import { BackgroundLayer } from './components/BackgroundLayer';
import { MenuScreen } from './components/MenuScreen';
import { DetailScreen } from './components/DetailScreen';
import { LoadingScreen } from './components/LoadingScreen';
import { SCREEN_BY_GAME_ID, SCREEN_COMPONENTS, isGameScreen } from './gameRegistry';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { Splash } from './components/Splash';
import {
  CUSTOM_THEME_ID,
  MENU_THEMES,
  imageFileToDataUrl,
  loadCustomWallpaper,
  loadThemeId,
  saveCustomWallpaper,
  saveThemeId,
} from './lib/themes';
import { colors } from './theme';
import { APP } from './config/gameConfig';

const logoUrl = getPublicAssetUrl(LOGO_PATH);
export default function App() {
  const { games, loading, error } = useGames();
  const [state, setState] = useState<AppState>({ screen: 'menu', selectedIndex: 0 });
  const [themeId, setThemeId] = useState<string | null>(loadThemeId);
  const [customUrl, setCustomUrl] = useState<string | null>(loadCustomWallpaper);
  const [splashDone, setSplashDone] = useState(false);
  const finishSplash = useCallback(() => setSplashDone(true), []);

  const themeOptions: (string | null)[] = [
    null,
    ...MENU_THEMES.map((t) => t.id),
    ...(customUrl ? [CUSTOM_THEME_ID] : []),
  ];
  const activeTheme = MENU_THEMES.find((t) => t.id === themeId) ?? null;
  const activeThemeUrl = themeId === CUSTOM_THEME_ID ? customUrl : (activeTheme?.url ?? null);
  const activeThemeLabel = themeId === CUSTOM_THEME_ID ? 'Mi fondo' : (activeTheme?.label ?? 'Automático');

  function cycleTheme() {
    const next = themeOptions[(themeOptions.indexOf(themeId) + 1) % themeOptions.length];
    setThemeId(next);
    saveThemeId(next);
  }

  async function uploadWallpaper(file: File) {
    try {
      const dataUrl = await imageFileToDataUrl(file);
      saveCustomWallpaper(dataUrl);
      setCustomUrl(dataUrl);
      setThemeId(CUSTOM_THEME_ID);
      saveThemeId(CUSTOM_THEME_ID);
    } catch (err) {
      console.warn('No se pudo subir el fondo', err);
    }
  }

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
      const screen = (game && SCREEN_BY_GAME_ID[game.id]) || 'loading';
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
      } else if (e.key === 'Escape') {
        // loading screen or any game screen: back to the menu
        backToMenu();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state.screen, count, next, prev, confirm, backToMenu, startGame]);

  if (!splashDone) {
    return <Splash logoUrl={logoUrl} durationMs={APP.splashMs} onDone={finishSplash} />;
  }

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
  const ActiveGame = isGameScreen(state.screen) ? SCREEN_COMPONENTS[state.screen] : null;

  return (
    <div style={rootStyle}>
      <BackgroundLayer games={games} selectedIndex={state.selectedIndex} themeUrl={activeThemeUrl} />

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

      {state.screen === 'menu' && (
        <ThemeSwitcher label={activeThemeLabel} onClick={cycleTheme} onUpload={uploadWallpaper} />
      )}

      {state.screen === 'detail' && <DetailScreen game={selectedGame} onBack={backToMenu} onStart={startGame} />}

      {state.screen === 'loading' && <LoadingScreen gameName={selectedGame.name} onBack={backToMenu} />}

      {ActiveGame && <ActiveGame onBack={backToMenu} />}
    </div>
  );
}

const rootStyle: CSSProperties = {
  position: 'relative',
  width: '100vw',
  height: '100vh',
  overflow: 'hidden',
  background: colors.bg,
  fontFamily: "'Manrope', sans-serif",
  color: '#f5f5f5',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
