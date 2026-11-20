import { CAREER } from '../config/gameConfig';
import type { CareerPlayerState } from './careerTypes';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: (state: CareerPlayerState) => boolean;
}

const hasEvent = (state: CareerPlayerState, type: string) => state.seasons.some((s) => s.events.some((e) => e.type === type));
const clubsPlayed = (state: CareerPlayerState) => new Set(state.seasons.map((s) => s.clubId).filter((id) => id !== null)).size;
const hasAward = (state: CareerPlayerState, kind: string) => (state.awards ?? []).some((a) => a.kind === kind);

/** Career goals that stay unlocked across careers (kept in localStorage). */
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'debut', title: 'Primer pique', description: 'Jugá tu primera temporada como profesional.', unlocked: (s) => s.seasons.length >= 1 },
  { id: 'first_trophy', title: 'Vuelta olímpica', description: 'Ganá tu primer título.', unlocked: (s) => s.trophies.length >= 1 },
  { id: 'five_trophies', title: 'Vitrina llena', description: 'Juntá 5 títulos en una misma carrera.', unlocked: (s) => s.trophies.length >= 5 },
  {
    id: 'continental',
    title: 'Gloria continental',
    description: 'Levantá una copa internacional de clubes.',
    unlocked: (s) => s.trophies.some((t) => t.tier === 'continental'),
  },
  { id: 'call_up', title: 'Himno en el pecho', description: 'Recibí una convocatoria a tu selección.', unlocked: (s) => hasEvent(s, 'call_up') },
  { id: 'goals_100', title: 'Centenario', description: 'Llegá a 100 goles en tu carrera.', unlocked: (s) => s.careerTotals.gls >= 100 },
  { id: 'goals_250', title: 'Romperredes', description: 'Llegá a 250 goles en tu carrera.', unlocked: (s) => s.careerTotals.gls >= 250 },
  { id: 'assists_100', title: 'Pase de billar', description: 'Repartí 100 asistencias.', unlocked: (s) => s.careerTotals.ast >= 100 },
  { id: 'games_500', title: 'De fierro', description: 'Jugá 500 partidos oficiales.', unlocked: (s) => s.careerTotals.pj >= 500 },
  { id: 'ovr_90', title: 'Crack mundial', description: 'Alcanzá 90 de valoración.', unlocked: (s) => s.ovr >= 90 || s.seasons.some((x) => x.ovr >= 90) },
  { id: 'breakout', title: 'La joyita', description: 'Ganá el premio a la revelación del año.', unlocked: (s) => hasAward(s, 'breakout') },
  { id: 'top_scorer', title: 'Botín de oro', description: 'Terminá una temporada como goleador del torneo.', unlocked: (s) => hasAward(s, 'top_scorer') },
  { id: 'ballon', title: 'El mejor del mundo', description: 'Ganá el Balón de Oro.', unlocked: (s) => hasAward(s, 'ballon') },
  {
    id: 'wall',
    title: 'La muralla',
    description: 'Jugá 400 partidos como arquero.',
    unlocked: (st) => st.identity.position === 'POR' && st.careerTotals.pj >= 400,
  },
  {
    id: 'comeback',
    title: 'Vuelve el guerrero',
    description: 'Sufrí una lesión grave y después ganá un título.',
    unlocked: (s) => {
      const injuredAt = s.seasons.findIndex((x) => x.events.some((e) => e.type === 'injury' && e.severity === 'major'));
      return injuredAt >= 0 && s.seasons.slice(injuredAt + 1).some((x) => x.events.some((e) => e.type === 'trophy'));
    },
  },
  { id: 'globetrotter', title: 'Trotamundos', description: 'Jugá en 6 clubes distintos.', unlocked: (s) => clubsPlayed(s) >= 6 },
  { id: 'retired', title: 'Colgar los botines', description: 'Completá una carrera hasta el retiro.', unlocked: (s) => s.retired },
  {
    id: 'one_club',
    title: 'Hombre de un solo club',
    description: 'Retirate habiendo jugado toda tu carrera en el mismo club.',
    unlocked: (s) => s.retired && s.seasons.length >= 10 && clubsPlayed(s) === 1,
  },
  {
    id: 'pichanguero',
    title: 'Pichanguero de corazón',
    description: 'Retirate sin títulos, pero con 300 partidos en el lomo.',
    unlocked: (s) => s.retired && s.trophies.length === 0 && s.careerTotals.pj >= 300,
  },
  { id: 'legend', title: 'Leyenda eterna', description: 'Retirate con el legado más alto.', unlocked: (s) => s.retired && legacyOf(s).tier === 0 },
];

const STORE_KEY = 'pichanguero.career.achievements.v1';
export const ACHIEVEMENT_EVENT = 'pichanguero:achievement';

export function loadUnlockedAchievements(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORE_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

/** Records every achievement this career has just earned and announces the
 * new ones (the toast listens for the event). */
export function unlockAchievements(state: CareerPlayerState): Achievement[] {
  const unlocked = loadUnlockedAchievements();
  const fresh = ACHIEVEMENTS.filter((a) => !unlocked.has(a.id) && a.unlocked(state));
  if (fresh.length === 0) return fresh;
  fresh.forEach((a) => unlocked.add(a.id));
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify([...unlocked]));
    window.dispatchEvent(new CustomEvent(ACHIEVEMENT_EVENT, { detail: fresh.map((a) => a.title) }));
  } catch {
    // localStorage unavailable: the achievements just won't persist
  }
  return fresh;
}

export interface Legacy {
  /** 0 is the highest tier */
  tier: number;
  title: string;
  blurb: string;
  score: number;
}

/** How the career will be remembered: one number from games, peak level, titles, call-ups and awards. */
export function legacyOf(state: CareerPlayerState): Legacy {
  const w = CAREER.legacy.weights;
  const trophyPoints = state.trophies.reduce((sum, t) => sum + w.trophy[t.tier], 0);
  const peakOvr = Math.max(state.ovr, ...state.seasons.map((x) => x.ovr));
  const callUps = state.seasons.filter((x) => x.events.some((e) => e.type === 'call_up')).length;
  const score = Math.round(
    state.careerTotals.pj * w.match +
      Math.max(0, peakOvr - w.peakOvrFloor) * w.peakOvrPoint +
      callUps * w.callUp +
      trophyPoints +
      (state.awards ?? []).length * w.award
  );
  const tier = CAREER.legacy.tiers.findIndex((t) => score >= t.minScore);
  const found = CAREER.legacy.tiers[tier];
  return { tier, title: found.title, blurb: found.blurb, score };
}
