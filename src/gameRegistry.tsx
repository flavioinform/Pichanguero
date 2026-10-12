import type { ComponentType } from 'react';
import type { GameScreen } from './types';
import { GatoScreen } from './components/gato/GatoScreen';
import { TuttiOnlineScreen } from './components/tutti/TuttiOnlineScreen';
import { PasapalabraScreen } from './components/pasapalabra/PasapalabraScreen';
import { CareerScreen } from './components/career/CareerScreen';
import { HeadSoccerScreen } from './components/headsoccer/HeadSoccerScreen';
import { WordleScreen } from './components/wordle/WordleScreen';
import { AuctionScreen } from './components/auction/AuctionScreen';

export interface GameScreenProps {
  onBack: () => void;
}

/** Which screen opens for each row of the `games` table. A game id missing
 * from here falls back to the generic "coming soon" screen. */
export const SCREEN_BY_GAME_ID: Record<string, GameScreen> = {
  gato: 'gato',
  tutti: 'tutti',
  draft: 'pasapalabra',
  career: 'career',
  headsoccer: 'headsoccer',
  adivina: 'wordle',
  auction: 'auction',
};

/** The component behind each game screen. Typed as a full Record so adding
 * a screen to `GameScreen` without wiring it here is a compile error. */
export const SCREEN_COMPONENTS: Record<GameScreen, ComponentType<GameScreenProps>> = {
  gato: GatoScreen,
  tutti: TuttiOnlineScreen,
  pasapalabra: PasapalabraScreen,
  career: CareerScreen,
  headsoccer: HeadSoccerScreen,
  wordle: WordleScreen,
  auction: AuctionScreen,
};

export function isGameScreen(screen: string): screen is GameScreen {
  return screen in SCREEN_COMPONENTS;
}
