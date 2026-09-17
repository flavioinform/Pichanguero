// Curated pool of Tutti frutti futbolero categories. Every one maps to a
// rule checkable against the real data already imported (players, clubs,
// player_clubs, countries) — see src/lib/tuttiValidation.ts for how each
// rule kind is turned into a query.
//
// Some categories ("Jugador fachero", "Sobrevalorado", "Posible Balón de
// Oro", "Cooling break") are subjective prompts, but what actually gets
// auto-validated underneath is always the same objective thing — "is this
// a real player whose name starts with the letter" — same rule as plain
// "Jugador". The subjective spin is just flavor text; nobody's opinion on
// who's "fachero" needs to be adjudicated for this to auto-validate.

export type TuttiRule =
  | { kind: 'player_name' }
  | { kind: 'club_name' }
  | { kind: 'coach_name' }
  | { kind: 'country' }
  | { kind: 'player_at_clubs'; clubIds: number[] }
  | { kind: 'player_position'; position: string }
  | { kind: 'player_min_caps'; minCaps: number };

export interface TuttiCategory {
  key: string;
  label: string;
  icon: string;
  rule: TuttiRule;
}

export const TUTTI_CATEGORY_POOL: TuttiCategory[] = [
  { key: 'jugador', label: 'Jugador', icon: '⚽', rule: { kind: 'player_name' } },
  { key: 'club', label: 'Club', icon: '🛡️', rule: { kind: 'club_name' } },
  { key: 'entrenador', label: 'Entrenador', icon: '📋', rule: { kind: 'coach_name' } },
  { key: 'pais', label: 'País / Selección', icon: '🌎', rule: { kind: 'country' } },
  { key: 'pais_mundial', label: 'País que juega el Mundial', icon: '🌍', rule: { kind: 'country' } },
  { key: 'jugador_fachero', label: 'Jugador fachero', icon: '💇', rule: { kind: 'player_name' } },
  { key: 'jugador_sobrevalorado', label: 'Jugador sobrevalorado', icon: '📉', rule: { kind: 'player_name' } },
  { key: 'balon_de_oro', label: 'Posible ganador de un Balón de Oro', icon: '🏅', rule: { kind: 'player_name' } },
  {
    key: 'cooling_break',
    label: 'Jugador que haría bien el cooling break',
    icon: '🧊',
    rule: { kind: 'player_name' },
  },
  {
    key: 'barca_o_madrid',
    label: 'Jugó en el Barça o el Madrid',
    icon: '🏆',
    rule: { kind: 'player_at_clubs', clubIds: [131, 418] },
  },
  {
    key: 'river_o_boca',
    label: 'Jugó en River o Boca',
    icon: '🏆',
    rule: { kind: 'player_at_clubs', clubIds: [209, 189] },
  },
  { key: 'arquero', label: 'Arquero', icon: '🧤', rule: { kind: 'player_position', position: 'Goalkeeper' } },
  { key: 'defensor', label: 'Defensor', icon: '🛑', rule: { kind: 'player_position', position: 'Defender' } },
  { key: 'mediocampista', label: 'Mediocampista', icon: '🎯', rule: { kind: 'player_position', position: 'Midfield' } },
  { key: 'delantero', label: 'Delantero', icon: '🥅', rule: { kind: 'player_position', position: 'Attack' } },
  {
    key: 'mas_50_partidos',
    label: '+50 partidos en su selección',
    icon: '⭐',
    rule: { kind: 'player_min_caps', minCaps: 50 },
  },
];

export const TUTTI_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
