export type Screen = 'menu' | 'detail' | 'loading' | 'gato';

export interface AppState {
  screen: Screen;
  selectedIndex: number;
}

export type IconKey = 'grid' | 'dice' | 'help';

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

