/**
 * El equipo personalizado de POTRERO: qué se puede cambiar, las reglas
 * (número sin repetir, puntos de estadísticas), el guardado en el navegador y
 * el rival aleatorio. Es JSON plano y con versión, así que pasarlo a Supabase
 * más adelante es guardar el mismo objeto en una columna jsonb.
 *
 * Para agregar una opción (un peinado, una celebración, un color de la
 * paleta) alcanza con sumarla a la lista de abajo: los menús y el partido
 * leen estas mismas listas.
 */

// ---------------------------------------------------------------- opciones

export interface Option<T extends string = string> {
  id: T;
  label: string;
}

export const HAIR_STYLES = [
  { id: 'rapado', label: 'Rapado' },
  { id: 'corto', label: 'Corto' },
  { id: 'afro', label: 'Afro' },
  { id: 'trenzas', label: 'Trenzas' },
  { id: 'gorro', label: 'Gorro' },
  { id: 'cinta', label: 'Cinta' },
  { id: 'rodete', label: 'Rodete' },
  { id: 'cresta', label: 'Cresta' },
] as const satisfies readonly Option[];

export const SHIRT_TYPES = [
  { id: 'normal', label: 'Normal' },
  { id: 'suelta', label: 'Suelta' },
  { id: 'cortada', label: 'Mangas cortadas' },
] as const satisfies readonly Option[];

export const SHORTS_LENGTHS = [
  { id: 'corto', label: 'Corto' },
  { id: 'medio', label: 'Medio' },
  { id: 'largo', label: 'Largo' },
] as const satisfies readonly Option[];

export const SOCK_TYPES = [
  { id: 'altas', label: 'Altas' },
  { id: 'bajas', label: 'Bajas' },
] as const satisfies readonly Option[];

export const HEIGHTS = [
  { id: 0, label: 'Bajo' },
  { id: 1, label: 'Medio' },
  { id: 2, label: 'Alto' },
] as const;

export const BUILDS = [
  { id: 0, label: 'Delgado' },
  { id: 1, label: 'Normal' },
  { id: 2, label: 'Robusto' },
] as const;

export const CELEBRATIONS = [
  { id: 'brazos', label: 'Brazos arriba' },
  { id: 'salto', label: 'Salto y giro' },
  { id: 'baile', label: 'Baile' },
  { id: 'rodillas', label: 'De rodillas' },
] as const satisfies readonly Option[];

export const ENTRY_GESTURES = [
  { id: 'choque', label: 'Choque de manos' },
  { id: 'cielo', label: 'Señalar al cielo' },
  { id: 'saludo', label: 'Saludo' },
  { id: 'giro', label: 'Giro' },
] as const satisfies readonly Option[];

export const CREST_SHAPES = [
  { id: 'escudo', label: 'Escudo' },
  { id: 'circulo', label: 'Círculo' },
  { id: 'rombo', label: 'Rombo' },
  { id: 'hexagono', label: 'Hexágono' },
] as const satisfies readonly Option[];

export const CREST_SYMBOLS = [
  { id: 'estrella', label: 'Estrella' },
  { id: 'rayo', label: 'Rayo' },
  { id: 'corona', label: 'Corona' },
  { id: 'balon', label: 'Balón' },
  { id: 'llama', label: 'Llama' },
  { id: 'luna', label: 'Luna' },
  { id: 'cruz', label: 'Cruz' },
] as const satisfies readonly Option[];

export type HairStyle = (typeof HAIR_STYLES)[number]['id'];
export type ShirtType = (typeof SHIRT_TYPES)[number]['id'];
export type ShortsLength = (typeof SHORTS_LENGTHS)[number]['id'];
export type SockType = (typeof SOCK_TYPES)[number]['id'];
export type Celebration = (typeof CELEBRATIONS)[number]['id'];
export type EntryGesture = (typeof ENTRY_GESTURES)[number]['id'];
export type CrestShape = (typeof CREST_SHAPES)[number]['id'];
export type CrestSymbol = (typeof CREST_SYMBOLS)[number]['id'];

/** Paletas de los selectores de color. */
export const SKIN_TONES = ['#f6d3b3', '#e7b78e', '#c98f62', '#a06d45', '#7a4f33', '#4d3120'];
export const HAIR_COLORS = ['#16110e', '#3a2514', '#6a4424', '#b4893a', '#d9d2c3', '#8d1f1f', '#2e5bd8'];
export const SHOE_COLORS = ['#f2f2f2', '#17181c', '#ff5a36', '#35d0ff', '#e8ff3a', '#ff4fa3', '#7cff6b'];
export const TEAM_COLORS = [
  '#e63946', '#ff7b2e', '#ffb347', '#f4e04d', '#7cd957', '#2fb36a', '#1fb5a8', '#35a7ff',
  '#2e5bd8', '#7a4bd8', '#d14fc2', '#ff5d8f', '#efece2', '#9aa3ad', '#3b3f47', '#14151a',
];

// ---------------------------------------------------------------- estadísticas

export type StatKey = 'speed' | 'dribble' | 'shot' | 'pass';
export interface Stats {
  speed: number;
  dribble: number;
  shot: number;
  pass: number;
}
export const STAT_KEYS: readonly StatKey[] = ['speed', 'dribble', 'shot', 'pass'];
export const STAT_LABELS: Record<StatKey, string> = { speed: 'Velocidad', dribble: 'Regate', shot: 'Tiro', pass: 'Pase' };
export const STAT_HINTS: Record<StatKey, string> = {
  speed: 'Corre más rápido',
  dribble: 'Cuesta más quitarle la pelota y la gambeta se recarga antes',
  shot: 'Tiros más fuertes',
  pass: 'Pases más rápidos y largos',
};
/** Puntos para repartir entre las cuatro estadísticas de cada jugador. */
export const STAT_POINTS = 12;
export const STAT_MIN = 1;
/** Con 12 puntos y un máximo de 5, nadie puede tenerlo todo al máximo. */
export const STAT_MAX = 5;

export const sumStats = (s: Stats): number => STAT_KEYS.reduce((a, k) => a + s[k], 0);
export const freePoints = (s: Stats): number => STAT_POINTS - sumStats(s);

/** Sube o baja una estadística respetando el mínimo, el máximo y los puntos libres. */
export function changeStat(stats: Stats, key: StatKey, delta: 1 | -1): Stats {
  const next = stats[key] + delta;
  if (next < STAT_MIN || next > STAT_MAX) return stats;
  if (delta > 0 && freePoints(stats) <= 0) return stats;
  return { ...stats, [key]: next };
}

// ---------------------------------------------------------------- equipo

export interface PlayerCustom {
  nickname: string;
  /** 1 a 99, sin repetir dentro del equipo */
  number: number;
  skin: string;
  hairStyle: HairStyle;
  hairColor: string;
  beard: boolean;
  height: 0 | 1 | 2;
  build: 0 | 1 | 2;
  shirt: ShirtType;
  /** null: usa el color del equipo */
  shirtColor: string | null;
  shorts: ShortsLength;
  socks: SockType;
  shoeColor: string;
  celebration: Celebration;
  entry: EntryGesture;
  stats: Stats;
}

export interface CrestDesign {
  shape: CrestShape;
  symbol: CrestSymbol;
  color1: string;
  color2: string;
}

export interface StreetTeam {
  /** versión del formato guardado */
  v: 1;
  name: string;
  /** 3 letras */
  abbr: string;
  crest: CrestDesign;
  primary: string;
  secondary: string;
  /** en este orden: último hombre, armador, extremo */
  players: [PlayerCustom, PlayerCustom, PlayerCustom];
}

export const TEAM_NAME_MAX = 16;
export const NICKNAME_MAX = 12;
export const PLAYER_ROLES = ['Último hombre', 'Armador', 'Extremo'] as const;

export function defaultTeam(): StreetTeam {
  const base = (nickname: string, number: number, patch: Partial<PlayerCustom>): PlayerCustom => ({
    nickname,
    number,
    skin: SKIN_TONES[2],
    hairStyle: 'corto',
    hairColor: HAIR_COLORS[0],
    beard: false,
    height: 1,
    build: 1,
    shirt: 'normal',
    shirtColor: null,
    shorts: 'medio',
    socks: 'altas',
    shoeColor: SHOE_COLORS[0],
    celebration: 'brazos',
    entry: 'choque',
    stats: { speed: 3, dribble: 3, shot: 3, pass: 3 },
    ...patch,
  });
  return {
    v: 1,
    name: 'Los del Potrero',
    abbr: 'LDP',
    crest: { shape: 'escudo', symbol: 'rayo', color1: '#2e5bd8', color2: '#efece2' },
    primary: '#2e5bd8',
    secondary: '#efece2',
    players: [
      base('Tito', 4, { skin: SKIN_TONES[1], hairStyle: 'rapado', build: 2, shirt: 'suelta', shorts: 'largo', celebration: 'brazos', entry: 'choque', stats: { speed: 2, dribble: 3, shot: 3, pass: 4 } }),
      base('El Pibe', 10, { skin: SKIN_TONES[3], hairStyle: 'afro', hairColor: HAIR_COLORS[0], shoeColor: SHOE_COLORS[2], celebration: 'salto', entry: 'giro', stats: { speed: 3, dribble: 4, shot: 2, pass: 3 } }),
      base('Chango', 7, { skin: SKIN_TONES[0], hairStyle: 'cinta', hairColor: HAIR_COLORS[3], height: 0, build: 0, shirt: 'cortada', shorts: 'corto', socks: 'bajas', shoeColor: SHOE_COLORS[3], celebration: 'baile', entry: 'cielo', stats: { speed: 4, dribble: 3, shot: 3, pass: 2 } }),
    ],
  };
}

// ---------------------------------------------------------------- reglas

const hex = /^#[0-9a-fA-F]{6}$/;
const pickId = <T extends string>(list: readonly Option<T>[], value: unknown, fallback: T): T =>
  list.some((o) => o.id === value) ? (value as T) : fallback;
const pickColor = (value: unknown, fallback: string): string => (typeof value === 'string' && hex.test(value) ? value.toLowerCase() : fallback);
const pickLevel = (value: unknown): 0 | 1 | 2 => (value === 0 || value === 1 || value === 2 ? value : 1);

/** Tres letras mayúsculas a partir de un texto (para sugerir la abreviatura del nombre). */
export function suggestAbbr(name: string): string {
  const clean = name
    .normalize('NFD')
    .replace(/[^A-Za-z ]/g, '')
    .toUpperCase()
    .trim();
  const words = clean.split(/\s+/).filter((w) => w.length > 2);
  const letters = words.length >= 3 ? words.map((w) => w[0]).join('') : (words.join('') || clean.replace(/\s/g, ''));
  return (letters + 'XXX').slice(0, 3);
}

export function cleanAbbr(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(0, 3);
}

/** Números del 1 al 99 que todavía no usa otro jugador del equipo. */
export function takenNumbers(team: StreetTeam, exceptSlot: number): Set<number> {
  return new Set(team.players.filter((_, i) => i !== exceptSlot).map((p) => p.number));
}

/** Por qué un número no sirve, o null si está bien. */
export function numberProblem(team: StreetTeam, slot: number, value: number): string | null {
  if (!Number.isInteger(value) || value < 1 || value > 99) return 'El número va del 1 al 99.';
  if (takenNumbers(team, slot).has(value)) return `El ${value} ya lo usa otro jugador de tu equipo.`;
  return null;
}

/** Devuelve un equipo siempre válido a partir de cualquier cosa (guardado viejo, a mano, de la red). */
export function sanitizeTeam(input: unknown): StreetTeam {
  const base = defaultTeam();
  if (!input || typeof input !== 'object') return base;
  const t = input as Partial<StreetTeam>;
  const crest = (t.crest ?? {}) as Partial<CrestDesign>;
  const name = typeof t.name === 'string' && t.name.trim() ? t.name.trim().slice(0, TEAM_NAME_MAX) : base.name;
  const used = new Set<number>();
  const players = base.players.map((def, i) => {
    const p = ((t.players ?? [])[i] ?? {}) as Partial<PlayerCustom>;
    const stats = { ...def.stats };
    for (const k of STAT_KEYS) {
      const v = Number((p.stats as Partial<Stats> | undefined)?.[k]);
      stats[k] = Number.isFinite(v) ? Math.max(STAT_MIN, Math.min(STAT_MAX, Math.round(v))) : def.stats[k];
    }
    // si los puntos se pasan, se le quita al más alto hasta llegar al tope
    while (sumStats(stats) > STAT_POINTS) {
      const top = STAT_KEYS.reduce((a, k) => (stats[k] > stats[a] ? k : a), STAT_KEYS[0]);
      stats[top] -= 1;
    }
    let number = Number.isInteger(p.number) && p.number! >= 1 && p.number! <= 99 ? p.number! : def.number;
    while (used.has(number)) number = (number % 99) + 1;
    used.add(number);
    return {
      nickname: typeof p.nickname === 'string' && p.nickname.trim() ? p.nickname.trim().slice(0, NICKNAME_MAX) : def.nickname,
      number,
      skin: pickColor(p.skin, def.skin),
      hairStyle: pickId(HAIR_STYLES, p.hairStyle, def.hairStyle),
      hairColor: pickColor(p.hairColor, def.hairColor),
      beard: p.beard === true,
      height: pickLevel(p.height),
      build: pickLevel(p.build),
      shirt: pickId(SHIRT_TYPES, p.shirt, def.shirt),
      shirtColor: p.shirtColor ? pickColor(p.shirtColor, '') || null : null,
      shorts: pickId(SHORTS_LENGTHS, p.shorts, def.shorts),
      socks: pickId(SOCK_TYPES, p.socks, def.socks),
      shoeColor: pickColor(p.shoeColor, def.shoeColor),
      celebration: pickId(CELEBRATIONS, p.celebration, def.celebration),
      entry: pickId(ENTRY_GESTURES, p.entry, def.entry),
      stats,
    } satisfies PlayerCustom;
  }) as StreetTeam['players'];
  return {
    v: 1,
    name,
    abbr: cleanAbbr(typeof t.abbr === 'string' ? t.abbr : '').padEnd(3, 'X').slice(0, 3) || suggestAbbr(name),
    crest: {
      shape: pickId(CREST_SHAPES, crest.shape, base.crest.shape),
      symbol: pickId(CREST_SYMBOLS, crest.symbol, base.crest.symbol),
      color1: pickColor(crest.color1, base.crest.color1),
      color2: pickColor(crest.color2, base.crest.color2),
    },
    primary: pickColor(t.primary, base.primary),
    secondary: pickColor(t.secondary, base.secondary),
    players,
  };
}

// ---------------------------------------------------------------- guardado

const STORAGE_KEY = 'pichanguero.street.team.v1';

export function loadTeam(): StreetTeam {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? sanitizeTeam(JSON.parse(raw)) : defaultTeam();
  } catch {
    return defaultTeam();
  }
}

export function hasSavedTeam(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

export function saveTeam(team: StreetTeam): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(team));
  } catch {
    // sin almacenamiento (modo privado, cuota): el equipo igual sirve para esta sesión
  }
}

export function resetTeam(): StreetTeam {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignorar
  }
  return defaultTeam();
}

/** El equipo como texto, para mandarlo al rival en el online o guardarlo en una columna. */
export const teamToJson = (team: StreetTeam): string => JSON.stringify(team);
export function teamFromJson(json: string | null | undefined): StreetTeam | null {
  if (!json) return null;
  try {
    return sanitizeTeam(JSON.parse(json));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- aleatorio

type Rng = () => number;
const pick = <T,>(list: readonly T[], rng: Rng): T => list[Math.floor(rng() * list.length)];
const shuffle = <T,>(list: readonly T[], rng: Rng): T[] => [...list].sort(() => rng() - 0.5);

const NICKNAMES = ['Tito', 'El Pibe', 'Chango', 'Cuervo', 'Mono', 'Chispa', 'Gordo', 'Flaco', 'Nene', 'Pelao', 'Turco', 'Polaco', 'Negro', 'Rubio', 'Cabezón', 'Chino', 'Ratón', 'Zurdo', 'Loco', 'Gato', 'Pantera', 'Tano', 'Cacho', 'Mosca'];
const TEAM_NAMES = ['Los Cuervos', 'Atlético Esquina', 'Banda del Muro', 'Barrio Alto', 'Deportivo Vereda', 'Los Pibes', 'Real Potrero', 'Furia de Barrio', 'Los Faroles', 'Sporting Cancha', 'Unidos Pasaje', 'La Jaula FC', 'Estrella Roja', 'Los Gatos', 'Club del Cerro', 'Tigres Norte'];

/** Un número aleatorio de 4 estadísticas que suma exactamente STAT_POINTS. */
function randomStats(rng: Rng): Stats {
  const stats: Stats = { speed: 1, dribble: 1, shot: 1, pass: 1 };
  let left = STAT_POINTS - 4;
  while (left > 0) {
    // se elige solo entre las que todavía no llegaron al máximo, así siempre se avanza
    const open = STAT_KEYS.filter((k) => stats[k] < STAT_MAX);
    if (open.length === 0) break;
    stats[pick(open, rng)] += 1;
    left -= 1;
  }
  return stats;
}

const lum = (c: string) => {
  const n = parseInt(c.slice(1), 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
};
/** Qué tan distintos se ven dos colores (0 a ~440). */
export function colorDistance(a: string, b: string): number {
  const x = parseInt(a.slice(1), 16);
  const y = parseInt(b.slice(1), 16);
  const d = (s: number) => ((x >> s) & 255) - ((y >> s) & 255);
  return Math.hypot(d(16), d(8), d(0)) + Math.abs(lum(a) - lum(b)) * 0.3;
}

export function randomTeam(rng: Rng = Math.random, avoid?: StreetTeam): StreetTeam {
  const colors = shuffle(TEAM_COLORS, rng).filter((c) => !avoid || (colorDistance(c, avoid.primary) > 150 && colorDistance(c, avoid.secondary) > 60));
  const primary = colors[0] ?? pick(TEAM_COLORS, rng);
  const secondary = colors.find((c) => colorDistance(c, primary) > 140) ?? '#efece2';
  const name = pick(TEAM_NAMES, rng);
  const nicknames = shuffle(NICKNAMES, rng);
  const numbers = shuffle(Array.from({ length: 99 }, (_, i) => i + 1), rng).slice(0, 3);
  const players = [0, 1, 2].map((i): PlayerCustom => ({
    nickname: nicknames[i],
    number: numbers[i],
    skin: pick(SKIN_TONES, rng),
    hairStyle: pick(HAIR_STYLES, rng).id,
    hairColor: pick(HAIR_COLORS, rng),
    beard: rng() < 0.3,
    height: pick([0, 1, 2] as const, rng),
    build: pick([0, 1, 2] as const, rng),
    shirt: pick(SHIRT_TYPES, rng).id,
    shirtColor: null,
    shorts: pick(SHORTS_LENGTHS, rng).id,
    socks: pick(SOCK_TYPES, rng).id,
    shoeColor: pick(SHOE_COLORS, rng),
    celebration: pick(CELEBRATIONS, rng).id,
    entry: pick(ENTRY_GESTURES, rng).id,
    stats: randomStats(rng),
  })) as StreetTeam['players'];
  return {
    v: 1,
    name,
    abbr: suggestAbbr(name),
    crest: { shape: pick(CREST_SHAPES, rng).id, symbol: pick(CREST_SYMBOLS, rng).id, color1: primary, color2: secondary },
    primary,
    secondary,
    players,
  };
}

/** Un rival con colores bien distintos a los tuyos y nombres inventados. */
export const randomRival = (mine: StreetTeam, rng: Rng = Math.random): StreetTeam => randomTeam(rng, mine);

/** Si los dos equipos se parecen demasiado, el segundo juega con los colores invertidos. Es determinista: los dos lados del online lo resuelven igual. */
export function distinctPair(a: StreetTeam, b: StreetTeam): [StreetTeam, StreetTeam] {
  if (colorDistance(a.primary, b.primary) > 90) return [a, b];
  return [a, { ...b, primary: b.secondary, secondary: b.primary }];
}
