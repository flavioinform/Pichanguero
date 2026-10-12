export type CareerDifficulty = 'intensa' | 'normal' | 'expres';

export type PositionCode =
  | 'POR'
  | 'DFC'
  | 'LI'
  | 'LD'
  | 'MCD'
  | 'MC'
  | 'MI'
  | 'MD'
  | 'MCO'
  | 'EI'
  | 'ED'
  | 'DC';

export type Foot = 'izquierda' | 'derecha';

export interface CareerIdentity {
  lastName: string;
  number: number;
  foot: Foot;
  nationality: { id: number; name: string; code: string | null };
  position: PositionCode;
}

export interface ClubOfferOption {
  clubId: number;
  clubName: string;
  competitionName: string | null;
  countryName: string | null;
}

export type CareerEventType =
  | 'debut'
  | 'injury'
  | 'trophy'
  | 'call_up'
  | 'transfer_offer'
  | 'transfer_rejected'
  | 'loan_start'
  | 'loan_return'
  | 'release'
  | 'retirement';

export interface CareerEvent {
  type: CareerEventType;
  sceneKey: string;
  title: string;
  description: string;
  severity?: 'minor' | 'major';
  trophyName?: string;
  trophyTier?: 'league' | 'cup' | 'continental';
}

export interface CareerSeasonRecord {
  age: number;
  clubId: number | null;
  clubName: string | null;
  ovr: number;
  pj: number;
  gls: number;
  ast: number;
  events: CareerEvent[];
}

export type PendingDecisionKind = 'club_offer' | 'transfer_offer' | 'retire_or_continue';

export interface PendingDecision {
  kind: PendingDecisionKind;
  prompt: string;
  options: ClubOfferOption[];
}

export type CareerStatus = 'libre' | 'contratado' | 'retirado';

export interface CareerPlayerState {
  identity: CareerIdentity;
  /** `players.image_url` of a real player in the same position (and, when
   * available, nationality) from the imported dataset — assigned once at
   * character creation as a stand-in portrait and never re-rolled, since
   * there's no real photo of a made-up player. */
  avatarImageUrl: string | null;
  difficulty: CareerDifficulty;
  age: number;
  ovr: number;
  valueEUR: number;
  status: CareerStatus;
  currentClubId: number | null;
  currentClubName: string | null;
  /** The league the current club plays in — real name from `competitions`,
   * used to name league-title trophies instead of a generic "Liga". */
  currentCompetitionName: string | null;
  /** Set while on loan: the parent club (and its league) to return to at the
   * end of the loan season. Null when not on loan. */
  loanParentClubId: number | null;
  loanParentClubName: string | null;
  loanParentCompetitionName: string | null;
  careerTotals: { pj: number; gls: number; ast: number };
  trophies: { label: string; tier: 'league' | 'cup' | 'continental' }[];
  seasons: CareerSeasonRecord[];
  pendingDecision: PendingDecision | null;
  pendingEvents: CareerEvent[];
  retired: boolean;
}

