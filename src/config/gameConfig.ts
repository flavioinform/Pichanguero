/**
 * Every tunable number in one place, grouped by game. Change a value here and
 * the game picks it up; nothing below is read from anywhere else.
 *
 * Not here on purpose: the Head Soccer physics (src/lib/headSoccer/physics.ts)
 * is a self-contained engine whose constants only make sense together, and
 * layout pixel sizes stay next to the component that draws them.
 */
import type { BoneKey } from '../components/street/characters/bonePoser';
import type { ColorKeyConfig } from '../components/street/characters/looks';

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
  /** solo: the whole rosco; online duel: each player's own time bank */
  roundSeconds: 180,
  /** online duel: a wrong answer also hands the turn over, like the TV show */
  wrongAnswerPassesTurn: true,
  /** online duel: how long past a player's bank before anyone may close their turn */
  expireGraceMs: 1500,
};

export const HEAD_SOCCER_ONLINE = {
  /** Realtime drops anything above its per-second limit, so the match sends
   * little: inputs only when they change, plus a periodic snapshot. */
  realtimeEventsPerSecond: 30,
  /** the host sends the authoritative game state every this many physics ticks (60/s) */
  snapshotEveryTicks: 6,
  /** an input is resent at least this often even if unchanged, to recover a lost message */
  inputHeartbeatMs: 300,
  /** a player's own position is kept (not snapped) while it's within this many px of the host's */
  ownPositionTolerancePx: 60,
  /** how often each peer says "still here" */
  pingIntervalMs: 2000,
  /** silence longer than this shows the "reconnecting" banner */
  staleAfterMs: 5000,
};

export const STREET = {
  matchSeconds: 180,
  targetGoals: 5,
  /** px/s */
  speed: 150,
  accel: 9,
  /** the ball carrier is a bit slower than a free runner */
  carrierSlow: 0.92,
  /** gambeta: a short burst of speed during which nobody can take the ball */
  trickMs: 380,
  trickCooldownMs: 1100,
  trickBoost: 1.7,
  shotPower: 640,
  passPowerMin: 300,
  passPowerMax: 470,
  /** a ball faster than this is blocked by a player instead of caught */
  catchMaxSpeed: 500,
  ballFriction: 1.1,
  wallBounce: 0.8,
  /** a player who just kicked can't pick the ball straight back up */
  kickPickupCdMs: 280,
  tackledPickupCdMs: 500,
  /** after losing the ball a player can't tackle back for this long */
  tackleLockMs: 900,
  goalPauseMs: 1700,
  /** the controlled player only switches when another one is this much closer to the ball */
  switchHysteresisPx: 16,
  /** after switching player by hand, the automatic switch leaves you alone this long */
  switchLockMs: 1200,
  humanAimError: 0,
  /** each team's last man stands this far off his goal line and comes out for a loose ball this close to it */
  keeper: { linePx: 34, comeOutPx: 130 },
  /** style meter (0-100 per team): street flair fills it, a full meter starts "Modo Crack" */
  style: {
    /** gambeta started with a rival right on top of you */
    trickPastRival: 14,
    /** caño: going through a rival mid-gambeta leaves them on the floor */
    cano: 30,
    goal: 20,
    /** points lost by the team whose carrier gets robbed */
    robbed: 8,
    /** how long a rival stays down after a caño */
    canoStunMs: 900,
    rivalNearPx: 46,
  },
  crack: {
    durationMs: 10_000,
    speedBoost: 1.15,
    shotBoost: 1.15,
    /** a goal scored in Modo Crack is worth this many */
    goalValue: 2,
  },
  popupMs: 1100,
  /** pase y tiro tienen una preparación: la pelota sale en el "contacto", el mismo instante en que la animación le pega */
  kick: {
    passWindupMs: 90,
    shotWindupMs: 140,
    /** cuánto sigue la animación después del contacto */
    followMs: 260,
    /** durante la preparación el jugador se frena un poco */
    windupSlow: 0.85,
  },
  /** cuánto cambia el juego por cada punto de estadística (el 3 es el valor "normal") */
  stats: {
    /** velocidad: ±1,2 % de velocidad por punto */
    speedPerPoint: 0.012,
    /** tiro: ±3 % de potencia por punto */
    shotPerPoint: 0.03,
    /** pase: ±3 % de potencia por punto */
    passPerPoint: 0.03,
    /** regate: a quien lo marca le cuesta un 6 % más (o menos) quitarle la pelota por punto */
    tackleResistPerPoint: 0.06,
    /** regate: la gambeta se recarga un 5 % más rápido (o lento) por punto */
    trickCdPerPoint: 0.05,
  },
  /** animación de inicio. Todos los tiempos en milisegundos desde que empieza. */
  intro: {
    /** duración total al empezar o reiniciar el partido */
    matchMs: 7600,
    /** versión corta, después de cada gol */
    restartMs: 2500,
    /** en la versión corta, cuánto dura "¡LISTOS!" antes de "¡YA!" */
    restartReadyMs: 1500,
    /** los jugadores entran trotando desde su arco; cada uno sale un poco después del anterior */
    entry: { startMs: 1400, endMs: 3600, staggerMs: 220 },
    /** saludo de cada equipo, parados en el centro */
    greet: { startMs: 3600, endMs: 4500 },
    /** vuelta trotando a la posición de saque */
    back: { startMs: 4500, endMs: 5700 },
    /** las tarjetas con nombre y número */
    cards: { startMs: 1700, endMs: 4500, staggerMs: 220 },
    /** cuenta regresiva: 3, 2, 1 y la salida, un cartel cada beatMs */
    countdown: { startMs: 4600, beatMs: 750 },
    /** cuánto tarda la cámara en acomodarse a la de juego si se salta la intro */
    skipSettleMs: 700,
  },
  /** hold the shoot key to load the shot; it goes off on release */
  charge: { maxMs: 800, minPower: 0.8, maxPower: 1.35 },
  /** sprint (Shift): más rápido mientras dure el aire; se recarga sin correr a fondo */
  sprint: {
    boost: 1.3,
    /** segundos de sprint con el aire lleno */
    drainS: 3,
    /** segundos para recargar el aire de cero a lleno */
    regenS: 4.5,
    /** con menos aire que esto no arranca un sprint nuevo (el que viene corriendo sigue hasta vaciarlo) */
    minToStart: 0.2,
    /** la CPU solo sprinta con al menos este aire */
    cpuMin: 0.45,
  },
  /** barrida (K sin la pelota): se tira al piso hacia adelante; si llega a la pelota se la saca al que la lleva */
  slide: {
    /** cuánto dura el deslizamiento y cuánto tarda en levantarse después */
    moveMs: 420,
    getUpMs: 330,
    /** velocidad de salida (multiplica a la velocidad normal); después se va frenando */
    boost: 1.85,
    cooldownMs: 1500,
    /** distancia a la pelota a la que la barrida la alcanza */
    reachPx: 30,
    /** con qué fuerza sale la pelota de la barrida */
    pokePower: 240,
    /** el que pierde la pelota queda en el piso este tiempo */
    victimStunMs: 650,
    /** de atrás no vale: la barrida que llega por la espalda es falta y el barrido se queda con la pelota */
    fromBehindDot: -0.35,
    style: 12,
  },
  /** cola de vaca (gambeta tirando hacia atrás): pisa la pelota, la arrastra y sale para el otro lado */
  cola: {
    ms: 420,
    /** salida en la dirección nueva */
    boost: 1.35,
    /** qué tan opuesta tiene que ser la dirección a donde mira (-1 = justo atrás) */
    backDot: -0.25,
    /** el rival que te encaraba queda pagando: no puede quitar por este tiempo */
    rivalLockMs: 700,
    style: 18,
  },
  difficulty: {
    easy: { speed: 0.85, aimErr: 120, tackleMs: 440, decisionMs: 650, shootRange: 230, slideChance: 0.08 },
    normal: { speed: 0.95, aimErr: 70, tackleMs: 310, decisionMs: 450, shootRange: 260, slideChance: 0.16 },
    hard: { speed: 1.05, aimErr: 45, tackleMs: 220, decisionMs: 300, shootRange: 290, slideChance: 0.25 },
  },
};

/** El personaje 3D de POTRERO. Si el .glb no está, se usa el jugador armado por código. */
export const STREET_CHARACTER = {
  /**
   * El modelo se busca solo: dejá el archivo en src/assets/models/jugador.glb y listo.
   * Si preferís otra ubicación (por ejemplo public/models/), poné acá su ruta: '/models/mi-jugador.glb'.
   */
  modelUrl: null as string | null,
  /** altura a la que se escala el modelo, en metros (después se aplica la altura y contextura de cada jugador) */
  heightM: 1.8,
  /** segundos que tarda en mezclarse una animación con la siguiente */
  crossFadeS: 0.2,
  /** a qué velocidad real (m/s) los clips de trote y carrera se ven "a velocidad normal"; más rápido o lento acelera o frena el clip */
  trotSpeed: 3.0,
  sprintSpeed: 6.2,
  /** por debajo de esta velocidad está parado; por encima de la otra, corre en vez de trotar */
  idleBelow: 0.35,
  sprintAbove: 4.4,
  /** en qué fracción de los clips pass y shot el pie toca la pelota (0 = al empezar, 1 = al terminar) */
  kickContact: { pass: 0.4, shot: 0.45 },
  /** qué hueso lleva el número de la espalda (se busca un hueso cuyo nombre contenga esto) */
  numberBone: 'spine01',

  /*
   * Adaptación al modelo que tengas. Los valores de abajo son para el que viene
   * puesto: "man base character (rigged)" de grab3d.com (CC0 según los datos del
   * propio archivo), reducido a 15 mil triángulos. Trae solo los clips walk y
   * run: lo demás (quieto, patada, gambeta, caída, festejos, saludos) lo arma
   * characters/bonePoser.ts moviendo los huesos.
   */
  /** nombres de los clips del modelo para cada animación del juego (se usa el primero que exista) */
  clipNames: {
    trot: ['walk'],
    sprint: ['run'],
  } as Record<string, string[]>,
  /** mallas del modelo que no se muestran (armas, capa...) */
  hideMeshes: [] as string[],
  /** si el modelo no tiene materiales con los nombres de types.ts, qué malla se pinta con qué: jersey, shorts, socks, skin, hair o shoes */
  meshSlots: {} as Record<string, string>,
  /** cuánto tiñe el color del equipo a una malla con textura (0 = nada, 1 = todo el color) */
  tintStrength: 0.7,
  /**
   * Para un modelo de una sola textura con ropa gris: en qué franjas de altura
   * (0 = pies, 1 = cabeza) están la remera y el short, para pintarlos con los
   * colores del equipo. null = no recolorear.
   */
  colorKey: {
    jersey: [0.512, 0.87],
    shorts: [0.3, 0.512],
    maxSat: 0.48,
    jerseyRef: 0.3,
    shortsRef: 0.04,
    skinRef: 0.3,
    hairRef: 0.03,
    armX: 0.13,
    hairFrom: 0.88,
    hairLum: 0.06,
    ankle: 0.065,
    // short largo y medias altas se tocan en la rodilla (sin rayita de piel en el medio)
    shortsBottom: { corto: 0.39, medio: 0.33, largo: 0.25 },
    socksTop: { altas: 0.255, bajas: 0.11 },
    beard: { from: 0.86, to: 0.892, depth: 0.05 },
  } as ColorKeyConfig | null,
  /** peinados 3D pegados al hueso de la cabeza (para un modelo con un solo pelo pintado); null = no ponerle */
  hair: { headBone: 'Head', headTopBone: 'head_end' } as { headBone: string; headTopBone: string } | null,
  /** radio de la cabeza = distancia entre esos dos huesos × esto */
  hairScale: 0.385,
  /** zapatillas 3D pegadas a los huesos de los pies (para un modelo descalzo); null = no ponerle */
  shoes: { footBones: ['LeftFoot', 'RightFoot'], toeBones: ['LeftToeBase', 'RightToeBase'] } as { footBones: [string, string]; toeBones: [string, string] } | null,
  /** huesos del esqueleto para las poses armadas por código (nombres estilo Mixamo) */
  poseBones: {
    hips: 'Hips', spineLow: 'Spine02', spineMid: 'Spine01', chest: 'Spine', neck: 'neck', head: 'Head',
    armL: 'LeftArm', foreArmL: 'LeftForeArm', armR: 'RightArm', foreArmR: 'RightForeArm',
    thighL: 'LeftUpLeg', shinL: 'LeftLeg', footL: 'LeftFoot', thighR: 'RightUpLeg', shinR: 'RightLeg', footR: 'RightFoot',
  } as Record<BoneKey, string>,
  /** cuánto bajar los brazos desde la pose de reposo del modelo (radianes; viene en "A") */
  armsDown: 0.72,
};

export const STREET_ONLINE = {
  /** the host sends the whole match every this many ticks (60/s) */
  snapshotEveryTicks: 6,
  /** keys are resent at least this often even if unchanged, to recover a lost message */
  inputHeartbeatMs: 300,
  /** the guest's own player is kept where they see it while it's within this many px of the host's */
  ownPositionTolerancePx: 45,
  pingIntervalMs: 2000,
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
  /** total players on offer in the bigger modes (never fewer than a full XI each) */
  poolSizes: { big: 30, max: 40 },
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

  /** individual prizes handed out at the end of a season */
  awards: {
    /** young player of the year: this age or younger with at least this many goals + assists; once per career */
    breakout: { maxAge: 20, minGoalsPlusAssists: 18 },
    topScorerMinGoals: 20,
    /** Balón de Oro: needs this OVR plus a title or a big season, and then some luck */
    ballon: { minOvr: 88, minGoalsPlusAssists: 25, chance: 0.4 },
  },

  /** how a finished career is remembered. Goals aren't counted directly, so a
   * centre-back or a keeper can be a legend too: what counts is how long and
   * how high you played, what you won and how often your country called. */
  legacy: {
    weights: { match: 0.3, peakOvrFloor: 60, peakOvrPoint: 6, callUp: 8, award: 35, trophy: { league: 20, cup: 12, continental: 40 } },
    tiers: [
      { minScore: 560, title: 'Leyenda eterna', blurb: 'Tu nombre queda en la historia grande del fútbol.' },
      { minScore: 480, title: 'Ídolo', blurb: 'Hay una tribuna entera que todavía canta tu apellido.' },
      { minScore: 400, title: 'Figura', blurb: 'Fuiste protagonista en cada cancha que pisaste.' },
      { minScore: 340, title: 'Profesional de ley', blurb: 'Una carrera seria, de las que cualquiera firmaría.' },
      { minScore: 0, title: 'Pichanguero de barrio', blurb: 'No hubo gloria, pero nadie te quita lo jugado.' },
    ],
  },
};
