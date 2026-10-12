/**
 * Every tunable number in one place, grouped by game. Change a value here and
 * the game picks it up; nothing below is read from anywhere else.
 *
 * Not here on purpose: the Head Soccer physics (src/lib/headSoccer/physics.ts)
 * is a self-contained engine whose constants only make sense together, and
 * layout pixel sizes stay next to the component that draws them.
 */

export const APP = {
  /** length of the logo splash before the menu shows */
  splashMs: 5000,
  /** how often the live-matches widget refetches */
  liveMatchesPollMs: 60_000,
};

export const GATO = {
  /** failed guesses allowed on one cell before it closes */
  maxAttemptsPerCell: 6,
  /** tries to build a grid in which every cell has a valid answer */
  gridBuildAttempts: 200,
  /** seconds a player has on their turn */
  turnSeconds: 30,
  /** chance the CPU finds a right answer when it has one */
  cpuAccuracy: 0.6,
  cpuThinkDelayMs: 1100,
};

export const TUTTI = {
  /** seconds everyone else has to finish after someone hits "Basta" */
  graceSeconds: 6,
  letterSpinMs: 1200,
  letterSpinTickMs: 60,
};

export const PASAPALABRA = {
  roundSeconds: 180,
};

export const HEAD_SOCCER_ONLINE = {
  /** how often each peer says "still here" */
  pingIntervalMs: 2000,
  /** silence longer than this shows the "reconnecting" banner */
  staleAfterMs: 5000,
};

export const AUCTION = {
  /** how long one lot can be bid on */
  bidWindowMs: 20_000,
  /** when each of the four clues is revealed, counted from the start of the lot */
  clueAtMs: [0, 5000, 10_000, 15_000],
  /** how long the result of a lot stays up before the next one */
  revealMs: 6000,
  /** host waits this long past the buzzer so a last-second bid still lands */
  finalizeGraceMs: 1200,
  /** local game loop resolution */
  tickMs: 200,
  /** fallback pool (only used if the curated list runs short): minimum national-team caps */
  fallbackMinCaps: 60,
  /** share of lots that are legends, when one of that position is available */
  legendChance: 0.35,
  /** "Rápida" match length as a share of a full XI per player */
  shortModeFactor: 0.6,
  budgetPresets: [100, 200, 300, 500],
  defaultBudget: 200,
  budgetMin: 10,
  budgetMax: 1000,
  /** blur (px) on the mystery player's photo after 1, 2, 3 and 4 clues */
  silhouetteBlurPx: [13, 10, 7, 4],
};

/** Season-simulation balance for the career mode. All chances are 0-1 per season. */
export const CAREER = {
  startAge: 16,
  retirementAge: 39,
  startOvr: { min: 46, max: 54 },
  startValueEUR: 100_000,
  ovrBounds: { min: 40, max: 99 },

  /** yearly OVR change by age; first row whose upToAge is >= the age applies */
  ovrChangeByAge: [
    { upToAge: 20, min: 3, max: 6 },
    { upToAge: 23, min: 2, max: 4 },
    { upToAge: 29, min: -1, max: 2 },
    { upToAge: 33, min: -3, max: -1 },
    { upToAge: Infinity, min: -6, max: -3 },
  ],

  /** market value = (ovr - ovrFloor)^2 * scale * age factor, rounded to `rounding` */
  marketValue: {
    ovrFloor: 45,
    scale: 4000,
    rounding: 10_000,
    ageFactors: [
      { upToAge: 24, factor: 1.3 },
      { upToAge: 29, factor: 1 },
      { upToAge: 33, factor: 0.55 },
      { upToAge: Infinity, factor: 0.2 },
    ],
  },

  /** matches played in a season: random in [min, max], scaled down for low OVR */
  matches: { min: 14, max: 34, fullLevelOvr: 70, lowLevelBase: 0.85, lowLevelDivisor: 500 },

  /** per-match goal/assist rates by role; `form` = ovr / formBaselineOvr */
  production: {
    formBaselineOvr: 70,
    noise: { floor: 0.7, spread: 0.6 },
    attackers: { goals: 0.42, assists: 0.18, noisy: 'goals' },
    playmakers: { goals: 0.1, assists: 0.3, noisy: 'assists' },
    defenders: { goals: 0.04, assists: 0.07, noisy: null },
  },

  injury: { chance: 0.14, majorShare: 0.22 },
  trophy: { baseChance: 0.08, ovrFloor: 65, perOvr: 0.006, continentalMinOvr: 80 },
  callUp: { minOvr: 74, minAge: 18, baseChance: 0.1, perOvrAboveMin: 0.02 },
  /** chance, after a season, that other clubs make an offer */
  transferOfferChance: 0.22,
  /** player asks to leave: chance = base + (ovr - ovrFloor) * perOvr, capped at maxChance */
  requestTransfer: { baseChance: 0.3, ovrFloor: 60, perOvr: 0.012, maxChance: 0.85 },
  loanRefusalChance: 0.15,
};
