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
  | { kind: 'player_min_caps'; minCaps: number }
  /** `players.country_of_citizenship`, as the dataset spells it (English) */
  | { kind: 'player_nationality'; countries: string[] }
  | { kind: 'player_foot'; foot: 'left' | 'right' }
  /** `players.sub_position`: the specific role inside the position */
  | { kind: 'player_sub_position'; subPositions: string[] }
  | { kind: 'player_height'; minCm?: number; maxCm?: number }
  /** a club whose current league (`clubs.competition_id`) is one of these */
  | { kind: 'club_in_league'; competitionIds: string[] };

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
  {
    key: 'mas_100_partidos',
    label: '+100 partidos en su selección',
    icon: '🌟',
    rule: { kind: 'player_min_caps', minCaps: 100 },
  },

  // nationality (as recorded in the dataset)
  { key: 'argentino', label: 'Jugador argentino', icon: '🇦🇷', rule: { kind: 'player_nationality', countries: ['Argentina'] } },
  { key: 'brasileno', label: 'Jugador brasileño', icon: '🇧🇷', rule: { kind: 'player_nationality', countries: ['Brazil'] } },
  { key: 'uruguayo', label: 'Jugador uruguayo', icon: '🇺🇾', rule: { kind: 'player_nationality', countries: ['Uruguay'] } },
  { key: 'chileno', label: 'Jugador chileno', icon: '🇨🇱', rule: { kind: 'player_nationality', countries: ['Chile'] } },
  { key: 'colombiano', label: 'Jugador colombiano', icon: '🇨🇴', rule: { kind: 'player_nationality', countries: ['Colombia'] } },
  { key: 'mexicano', label: 'Jugador mexicano', icon: '🇲🇽', rule: { kind: 'player_nationality', countries: ['Mexico'] } },
  { key: 'espanol', label: 'Jugador español', icon: '🇪🇸', rule: { kind: 'player_nationality', countries: ['Spain'] } },
  { key: 'frances', label: 'Jugador francés', icon: '🇫🇷', rule: { kind: 'player_nationality', countries: ['France'] } },
  { key: 'italiano', label: 'Jugador italiano', icon: '🇮🇹', rule: { kind: 'player_nationality', countries: ['Italy'] } },
  { key: 'aleman', label: 'Jugador alemán', icon: '🇩🇪', rule: { kind: 'player_nationality', countries: ['Germany'] } },
  { key: 'ingles', label: 'Jugador inglés', icon: '🏴', rule: { kind: 'player_nationality', countries: ['England'] } },
  { key: 'portugues', label: 'Jugador portugués', icon: '🇵🇹', rule: { kind: 'player_nationality', countries: ['Portugal'] } },
  {
    key: 'sudamericano',
    label: 'Jugador sudamericano',
    icon: '🌎',
    rule: {
      kind: 'player_nationality',
      countries: ['Argentina', 'Brazil', 'Uruguay', 'Chile', 'Colombia', 'Paraguay', 'Peru', 'Ecuador', 'Bolivia', 'Venezuela'],
    },
  },

  // the player himself
  { key: 'zurdo', label: 'Jugador zurdo', icon: '🦶', rule: { kind: 'player_foot', foot: 'left' } },
  { key: 'alto', label: 'Mide 1,90 m o más', icon: '🦒', rule: { kind: 'player_height', minCm: 190 } },
  { key: 'bajo', label: 'Mide 1,70 m o menos', icon: '🐜', rule: { kind: 'player_height', maxCm: 170 } },

  // specific roles
  { key: 'nueve', label: 'Centrodelantero (9)', icon: '🎯', rule: { kind: 'player_sub_position', subPositions: ['Centre-Forward'] } },
  { key: 'extremo', label: 'Extremo', icon: '⚡', rule: { kind: 'player_sub_position', subPositions: ['Left Winger', 'Right Winger'] } },
  { key: 'enganche', label: 'Enganche / mediapunta (10)', icon: '🪄', rule: { kind: 'player_sub_position', subPositions: ['Attacking Midfield'] } },
  { key: 'cinco', label: 'Volante de marca (5)', icon: '🧱', rule: { kind: 'player_sub_position', subPositions: ['Defensive Midfield'] } },
  { key: 'central', label: 'Defensor central', icon: '🛡️', rule: { kind: 'player_sub_position', subPositions: ['Centre-Back'] } },
  { key: 'lateral', label: 'Lateral', icon: '↔️', rule: { kind: 'player_sub_position', subPositions: ['Left-Back', 'Right-Back'] } },

  // clubs by league
  { key: 'club_premier', label: 'Club de la Premier League', icon: '🏴', rule: { kind: 'club_in_league', competitionIds: ['GB1'] } },
  { key: 'club_laliga', label: 'Club de LaLiga', icon: '🇪🇸', rule: { kind: 'club_in_league', competitionIds: ['ES1'] } },
  { key: 'club_seriea', label: 'Club de la Serie A', icon: '🇮🇹', rule: { kind: 'club_in_league', competitionIds: ['IT1'] } },
  { key: 'club_bundesliga', label: 'Club de la Bundesliga', icon: '🇩🇪', rule: { kind: 'club_in_league', competitionIds: ['L1'] } },
  { key: 'club_ligue1', label: 'Club de la Ligue 1', icon: '🇫🇷', rule: { kind: 'club_in_league', competitionIds: ['FR1'] } },
  { key: 'club_argentino', label: 'Club argentino', icon: '🇦🇷', rule: { kind: 'club_in_league', competitionIds: ['ARG1'] } },
  { key: 'club_brasileno', label: 'Club brasileño', icon: '🇧🇷', rule: { kind: 'club_in_league', competitionIds: ['BRA1'] } },

  // played for (club ids from the imported `clubs` table)
  {
    key: 'united_o_liverpool',
    label: 'Jugó en el Manchester United o el Liverpool',
    icon: '🔴',
    rule: { kind: 'player_at_clubs', clubIds: [985, 31] },
  },
  {
    key: 'juve_milan_inter',
    label: 'Jugó en la Juventus, el Milan o el Inter',
    icon: '⚫',
    rule: { kind: 'player_at_clubs', clubIds: [506, 5, 46] },
  },
  { key: 'psg', label: 'Jugó en el PSG', icon: '🗼', rule: { kind: 'player_at_clubs', clubIds: [583] } },
  { key: 'bayern', label: 'Jugó en el Bayern Múnich', icon: '🍺', rule: { kind: 'player_at_clubs', clubIds: [27] } },
  {
    key: 'chelsea_o_arsenal',
    label: 'Jugó en el Chelsea o el Arsenal',
    icon: '🔵',
    rule: { kind: 'player_at_clubs', clubIds: [631, 11] },
  },
  { key: 'city', label: 'Jugó en el Manchester City', icon: '🩵', rule: { kind: 'player_at_clubs', clubIds: [281] } },
];

export const TUTTI_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
