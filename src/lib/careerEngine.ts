import type {
  CareerDifficulty,
  CareerEvent,
  CareerIdentity,
  CareerPlayerState,
  CareerSeasonRecord,
  ClubOfferOption,
  PendingDecision,
  PositionCode,
} from './careerTypes';
import { CAREER } from '../config/gameConfig';
import type { CompetitionContext } from './careerData';

const ATTACKERS: PositionCode[] = ['DC', 'ED', 'EI', 'MCO'];
const PLAYMAKERS: PositionCode[] = ['MC', 'MI', 'MD', 'MCD'];
const DEFENDERS: PositionCode[] = ['DFC', 'LI', 'LD'];

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createInitialState(
  identity: CareerIdentity,
  difficulty: CareerDifficulty,
  avatarImageUrl: string | null = null
): CareerPlayerState {
  return {
    identity,
    avatarImageUrl,
    difficulty,
    age: CAREER.startAge,
    ovr: randInt(CAREER.startOvr.min, CAREER.startOvr.max),
    valueEUR: CAREER.startValueEUR,
    status: 'libre',
    currentClubId: null,
    currentClubName: null,
    currentCompetitionName: null,
    loanParentClubId: null,
    loanParentClubName: null,
    loanParentCompetitionName: null,
    careerTotals: { pj: 0, gls: 0, ast: 0 },
    trophies: [],
    seasons: [],
    pendingDecision: null,
    pendingEvents: [],
    retired: false,
  };
}

export function rollInitialClubOffers(candidateClubs: ClubOfferOption[]): ClubOfferOption[] {
  return shuffle(candidateClubs).slice(0, 3);
}

export function rollTransferOffers(
  candidateClubs: ClubOfferOption[],
  excludeClubId: number | null
): ClubOfferOption[] {
  const pool = candidateClubs.filter((c) => c.clubId !== excludeClubId);
  return shuffle(pool).slice(0, 3);
}

function ovrDelta(age: number): number {
  const band = CAREER.ovrChangeByAge.find((b) => age <= b.upToAge) ?? CAREER.ovrChangeByAge[CAREER.ovrChangeByAge.length - 1];
  return randInt(band.min, band.max);
}

function estimateValue(ovr: number, age: number): number {
  const { ovrFloor, scale, rounding, ageFactors } = CAREER.marketValue;
  const base = Math.max(0, ovr - ovrFloor) ** 2 * scale;
  const ageFactor = (ageFactors.find((a) => age <= a.upToAge) ?? ageFactors[ageFactors.length - 1]).factor;
  return Math.round((base * ageFactor) / rounding) * rounding;
}

function statsForSeason(position: PositionCode, ovr: number, pj: number): { gls: number; ast: number } {
  const { formBaselineOvr, noise, attackers, playmakers, defenders } = CAREER.production;
  const form = ovr / formBaselineOvr;
  const role = ATTACKERS.includes(position)
    ? attackers
    : PLAYMAKERS.includes(position)
      ? playmakers
      : DEFENDERS.includes(position)
        ? defenders
        : null;
  if (!role) return { gls: 0, ast: 0 };
  const jitter = () => noise.floor + Math.random() * noise.spread;
  return {
    gls: Math.round(pj * role.goals * form * (role.noisy === 'goals' ? jitter() : 1)),
    ast: Math.round(pj * role.assists * form * (role.noisy === 'assists' ? jitter() : 1)),
  };
}

function rollEvents(
  state: CareerPlayerState,
  season: CareerSeasonRecord,
  competitionContext: CompetitionContext | null
): CareerEvent[] {
  const events: CareerEvent[] = [];
  const { age, ovr } = state;

  if (state.seasons.length === 0) {
    events.push({
      type: 'debut',
      sceneKey: 'debut',
      title: '¡Debut profesional!',
      description: `${state.identity.lastName} pisa por primera vez una cancha profesional con ${season.clubName}.`,
    });
  }

  if (Math.random() < CAREER.injury.chance) {
    const major = Math.random() < CAREER.injury.majorShare;
    events.push({
      type: 'injury',
      sceneKey: major ? 'injury_major' : 'injury_minor',
      severity: major ? 'major' : 'minor',
      title: major ? 'Lesión grave' : 'Lesión leve',
      description: major
        ? 'Una lesión importante lo deja afuera varios meses de la temporada.'
        : 'Una molestia muscular lo marginó de algunos partidos, pero se recuperó pronto.',
    });
  }

  const trophyChance = CAREER.trophy.baseChance + Math.max(0, ovr - CAREER.trophy.ovrFloor) * CAREER.trophy.perOvr;
  if (Math.random() < trophyChance && season.clubName) {
    // Only names a competition we actually have real data for — no
    // fabricated "Copa continental" when the dataset has no continental
    // club competition for this confederation (see `fetchCompetitionContext`).
    const candidates: { name: string; tier: 'league' | 'cup' | 'continental' }[] = [];
    if (state.currentCompetitionName) candidates.push({ name: state.currentCompetitionName, tier: 'league' });
    if (competitionContext?.domesticCupName) candidates.push({ name: competitionContext.domesticCupName, tier: 'cup' });
    if (ovr >= CAREER.trophy.continentalMinOvr && competitionContext && competitionContext.continentalCupNames.length > 0) {
      candidates.push({ name: pick(competitionContext.continentalCupNames), tier: 'continental' });
    }

    if (candidates.length > 0) {
      const { name: trophyName, tier } = pick(candidates);
      events.push({
        type: 'trophy',
        sceneKey: `trophy_${tier}`,
        trophyName,
        trophyTier: tier,
        title: `¡${trophyName} campeón!`,
        description: `${season.clubName} se consagra campeón de ${trophyName} y ${state.identity.lastName} levanta el trofeo.`,
      });
      state.trophies.push({ label: `${trophyName} (${season.clubName}, ${age} años)`, tier });
    }
  }

  const callUp = CAREER.callUp;
  if (ovr >= callUp.minOvr && age >= callUp.minAge && Math.random() < callUp.baseChance + Math.max(0, ovr - callUp.minOvr) * callUp.perOvrAboveMin) {
    events.push({
      type: 'call_up',
      sceneKey: 'call_up_full',
      title: '¡Convocatoria a la selección!',
      description: `${state.identity.nationality.name} lo convoca para la próxima fecha FIFA.`,
    });
  }

  return events;
}

export interface SimulateSeasonResult {
  state: CareerPlayerState;
  events: CareerEvent[];
}

/** Advances one season in place on a cloned state. `chosenClub` is the club
 * the player will represent this season (null = stays free agent / released). */
export function simulateSeason(
  prevState: CareerPlayerState,
  chosenClub: ClubOfferOption | null,
  competitionContext: CompetitionContext | null = null
): SimulateSeasonResult {
  const state: CareerPlayerState = structuredClone(prevState);

  if (chosenClub) {
    state.status = 'contratado';
    state.currentClubId = chosenClub.clubId;
    state.currentClubName = chosenClub.clubName;
    state.currentCompetitionName = chosenClub.competitionName;
  }

  const m = CAREER.matches;
  const levelFactor = state.ovr >= m.fullLevelOvr ? 1 : m.lowLevelBase + state.ovr / m.lowLevelDivisor;
  const pj = Math.round(randInt(m.min, m.max) * levelFactor);
  const { gls, ast } = statsForSeason(state.identity.position, state.ovr, pj);

  const season: CareerSeasonRecord = {
    age: state.age,
    clubId: state.currentClubId,
    clubName: state.currentClubName,
    ovr: state.ovr,
    pj,
    gls,
    ast,
    events: [],
  };

  const events = rollEvents(state, season, competitionContext);
  season.events = events;

  state.careerTotals.pj += pj;
  state.careerTotals.gls += gls;
  state.careerTotals.ast += ast;

  const delta = ovrDelta(state.age);
  state.ovr = Math.max(CAREER.ovrBounds.min, Math.min(CAREER.ovrBounds.max, state.ovr + delta));
  state.valueEUR = estimateValue(state.ovr, state.age);

  state.seasons.push(season);
  state.age += 1;

  if (state.loanParentClubId) {
    events.push({
      type: 'loan_return',
      sceneKey: 'loan_return',
      title: 'Fin del préstamo',
      description: `${state.identity.lastName} vuelve a ${state.loanParentClubName} tras su temporada a préstamo en ${state.currentClubName}.`,
    });
    state.currentClubId = state.loanParentClubId;
    state.currentClubName = state.loanParentClubName;
    state.currentCompetitionName = state.loanParentCompetitionName;
    state.loanParentClubId = null;
    state.loanParentClubName = null;
    state.loanParentCompetitionName = null;
  }

  let pendingDecision: PendingDecision | null = null;
  if (Math.random() < CAREER.transferOfferChance && state.age <= CAREER.retirementAge) {
    pendingDecision = {
      kind: 'transfer_offer',
      prompt: 'Llegaron ofertas de otros clubes. ¿Dónde seguís tu carrera?',
      options: [],
    };
  }

  if (state.age > CAREER.retirementAge) {
    state.retired = true;
    events.push({
      type: 'retirement',
      sceneKey: 'retirement',
      title: 'Fin de una carrera',
      description: `${state.identity.lastName} cuelga los botines después de una carrera de ${state.seasons.length} temporadas.`,
    });
    pendingDecision = null;
  }

  state.pendingDecision = pendingDecision;
  state.pendingEvents = events;

  return { state, events };
}

export interface RequestOutcome {
  state: CareerPlayerState;
  offers: ClubOfferOption[];
  event: CareerEvent | null;
}

/** Player-initiated "pedir salida": not guaranteed — chance scales with form
 * (OVR), so a mediocre player asking to leave is more likely to be told no
 * than a standout one. On success, returns fresh offers for the usual
 * club-offer step; on failure, an informational event instead. */
export function requestTransfer(state: CareerPlayerState, candidateClubs: ClubOfferOption[]): RequestOutcome {
  const next: CareerPlayerState = structuredClone(state);
  if (next.status !== 'contratado' || next.loanParentClubId) {
    return {
      state: next,
      offers: [],
      event: {
        type: 'transfer_rejected',
        sceneKey: 'transfer_rejected',
        title: 'No hay nada para pedir',
        description: 'No estás en condiciones de pedir la salida ahora mismo.',
      },
    };
  }

  const t = CAREER.requestTransfer;
  const chance = t.baseChance + Math.max(0, next.ovr - t.ovrFloor) * t.perOvr;
  if (Math.random() < Math.min(t.maxChance, chance)) {
    const offers = rollTransferOffers(candidateClubs, next.currentClubId);
    if (offers.length > 0) return { state: next, offers, event: null };
  }

  return {
    state: next,
    offers: [],
    event: {
      type: 'transfer_rejected',
      sceneKey: 'transfer_rejected',
      title: 'Sin ofertas por ahora',
      description: `Pediste salir de ${next.currentClubName}, pero no llegó ninguna propuesta interesante en esta ventana de pases.`,
    },
  };
}

/** Player-initiated "pedir préstamo": sends the player to a different club
 * in the pool for exactly one season (more minutes, lower-stakes), then
 * `simulateSeason` automatically returns them to `loanParentClub*` once
 * that season is simulated. */
export function requestLoan(state: CareerPlayerState, candidateClubs: ClubOfferOption[]): RequestOutcome {
  const next: CareerPlayerState = structuredClone(state);
  if (next.status !== 'contratado' || next.loanParentClubId) {
    return {
      state: next,
      offers: [],
      event: {
        type: 'transfer_rejected',
        sceneKey: 'transfer_rejected',
        title: 'Préstamo no disponible',
        description: 'No estás en condiciones de salir a préstamo ahora mismo.',
      },
    };
  }

  const candidates = candidateClubs.filter((c) => c.clubId !== next.currentClubId);
  const destination = candidates.length > 0 ? pick(candidates) : null;
  if (!destination || Math.random() < CAREER.loanRefusalChance) {
    return {
      state: next,
      offers: [],
      event: {
        type: 'transfer_rejected',
        sceneKey: 'transfer_rejected',
        title: 'Préstamo rechazado',
        description: `${next.currentClubName} decidió no cederte a préstamo esta temporada.`,
      },
    };
  }

  next.loanParentClubId = next.currentClubId;
  next.loanParentClubName = next.currentClubName;
  next.loanParentCompetitionName = next.currentCompetitionName;
  next.currentClubId = destination.clubId;
  next.currentClubName = destination.clubName;
  next.currentCompetitionName = destination.competitionName;

  return {
    state: next,
    offers: [],
    event: {
      type: 'loan_start',
      sceneKey: 'loan_start',
      title: 'Cedido a préstamo',
      description: `${next.identity.lastName} sale cedido a ${destination.clubName} por una temporada para sumar minutos.`,
    },
  };
}

export function shouldPauseForDecision(state: CareerPlayerState): boolean {
  if (state.difficulty === 'intensa') return true;
  if (state.pendingDecision) return true;
  if (state.pendingEvents.some((e) => e.type === 'retirement' || e.type === 'trophy' || e.type === 'call_up')) {
    return true;
  }
  if (state.difficulty === 'normal') {
    return state.pendingEvents.length > 0;
  }
  // 'expres': only pause for decisions/majors, handled above
  return false;
}
