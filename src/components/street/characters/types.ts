/**
 * El "personaje": lo que la escena del partido, la vista previa del menú y la
 * intro le piden a un jugador 3D, sin importar cómo está hecho por dentro.
 * Hay dos implementaciones:
 *   - procedural (characters/proceduralCharacter.ts): el cuerpo armado por
 *     código. Es el que se usa mientras no haya un .glb.
 *   - gltf (characters/gltfCharacter.ts): un modelo .glb con esqueleto y
 *     animaciones. Se usa solo si existe public/models/jugador.glb.
 *
 * ================= QUÉ DEBE TENER EL .glb =================
 * Un solo personaje con esqueleto (skinned), mirando hacia +Z, parado en el
 * origen, en metros. Hasta ~15 mil triángulos y texturas de 1024 px o menos.
 *
 * MATERIALES (el nombre del material debe CONTENER una de estas palabras):
 *   jersey  camiseta  -> color del equipo (o el elegido para ese jugador)
 *   shorts  short     -> color secundario del equipo
 *   socks   calcetas  -> color secundario del equipo
 *   skin    piel      -> tono de piel del jugador
 *   hair    pelo      -> color de pelo del jugador
 *   shoes   zapatillas-> color de zapatillas del jugador
 * Si un material tiene textura, el color la tiñe: conviene que esas texturas
 * sean grises o blancas.
 *
 * PEINADOS (opcional): mallas llamadas hair_rapado, hair_corto, hair_afro,
 * hair_trenzas, hair_gorro, hair_cinta, hair_rodete, hair_cresta. Se muestra
 * solo la del peinado elegido. Una malla llamada "beard" se prende si el
 * jugador tiene barba.
 *
 * ANIMACIONES (nombre exacto del clip, sin importar mayúsculas):
 *   idle, trot, sprint            reposo, trote y carrera (en loop)
 *   brake, turn                   frenar y girar (cortas)
 *   pass, shot                    pase y tiro (una vez)
 *   trick                         gambeta o finta (una vez)
 *   fall                          tirado en el piso tras un caño (en loop)
 *   celebrate                     celebración de gol (en loop)
 *   greet                         saludo de entrada (en loop)
 * Variantes opcionales por elección del jugador: celebrate_brazos,
 * celebrate_salto, celebrate_baile, celebrate_rodillas, greet_choque,
 * greet_cielo, greet_saludo, greet_giro. Si una no está, se usa la general.
 * En pass y shot, el pie toca la pelota en la fracción del clip indicada en
 * STREET_CHARACTER.kickContact (gameConfig.ts): ajustala a tu animación.
 * ==========================================================
 */
import type * as THREE from 'three';
import type { Celebration, EntryGesture } from '../../../lib/street/team';

/** Lo que está haciendo un jugador en este cuadro. */
export interface MotionState {
  /** velocidad real en metros por segundo */
  speed: number;
  /** viene frenando fuerte */
  brake: boolean;
  /** está girando fuerte sobre sí mismo */
  turn: boolean;
  /** pase o tiro en curso: segundos desde que empezó, segundo del contacto, y cuánto dura el final */
  kick: { kind: 'pass' | 'shot'; t: number; contact: number; follow: number } | null;
  /** gambeta en curso: de 0 (empieza) a 1 (termina) */
  trick: number | null;
  /** qué gambeta: la de siempre (vuelta) o la cola de vaca (la pisa y sale para atrás) */
  trickKind: 'gambeta' | 'cola';
  /** barrida en curso: de 0 (se tira) a 1 (ya se levantó) */
  slide: number | null;
  /** 0 a 1: cuánto está tirado en el piso */
  down: number;
  /** festejando un gol, con la celebración que eligió */
  celebrate: Celebration | null;
  /** el equipo recibió un gol */
  sulk: boolean;
  /** saludando en la intro, con el gesto que eligió */
  greet: EntryGesture | null;
}

export const restMotion = (): MotionState => ({
  speed: 0,
  brake: false,
  turn: false,
  kick: null,
  trick: null,
  trickKind: 'gambeta',
  slide: null,
  down: 0,
  celebrate: null,
  sulk: false,
  greet: null,
});

export interface StreetCharacter {
  readonly kind: 'procedural' | 'gltf';
  /** lo que se agrega a la escena. La posición y hacia dónde mira los pone quien lo usa; el personaje solo se anima adentro. */
  readonly object: THREE.Object3D;
  /** avanza la animación `dt` segundos. `time` es el reloj de la escena y `seed` distingue a un jugador de otro. */
  update(dt: number, motion: MotionState, time: number, seed: number): void;
  dispose(): void;
}
