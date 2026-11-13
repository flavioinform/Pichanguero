/** Screens that run a game; each one is wired to its component in src/gameRegistry.tsx. */
export type GameScreen = 'gato' | 'tutti' | 'pasapalabra' | 'career' | 'headsoccer' | 'wordle' | 'auction' | 'street';

export type Screen = 'menu' | 'detail' | 'loading' | GameScreen;

export interface AppState {
  screen: Screen;
  selectedIndex: number;
}

export type IconKey = 'grid' | 'dice' | 'help' | 'rosco' | 'career' | 'headsoccer' | 'auction' | 'street';

export interface Game {
  id: string;
  name: string;
  shortDesc: string;
  howToPlay: string;
  iconKey: IconKey;
  bgImageUrl: string;
  isFlagship: boolean;
  sortOrder: number;
}
