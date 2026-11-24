/**
 * Carga el personaje .glb una sola vez y decide qué personaje usar: el .glb si
 * existe, o el armado por código si no. El partido, la vista previa y el fondo
 * del menú piden personajes acá, así que cambiar de modelo es cambiar el
 * archivo (o la ruta en STREET_CHARACTER.modelUrl), nada más.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { STREET_CHARACTER } from '../../../config/gameConfig';
import type { PlayerCustom } from '../../../lib/street/team';
import type { TeamColors } from '../playerModel';
import { GltfCharacter, type CharacterLibrary } from './gltfCharacter';
import { ProceduralCharacter } from './proceduralCharacter';
import type { StreetCharacter } from './types';

let cached: Promise<CharacterLibrary | null> | null = null;

/**
 * Los .glb que haya en src/assets/models: Vite los encuentra al compilar. Si
 * la carpeta está vacía no se pide nada a la red, así que sin modelo no
 * aparece ningún error en la consola.
 */
let bundledModels: Record<string, string> = {};
try {
  // Vite reemplaza esta llamada al compilar; no se puede envolver en otra condición o deja de funcionar
  bundledModels = import.meta.glob<string>('../../../assets/models/*.glb', { query: '?url', import: 'default', eager: true });
} catch {
  // fuera de Vite (por ejemplo en pruebas) no hay búsqueda automática: se usa STREET_CHARACTER.modelUrl
}

/** La ruta del modelo a usar, o null si no hay ninguno. */
export function characterModelUrl(): string | null {
  if (STREET_CHARACTER.modelUrl) return STREET_CHARACTER.modelUrl;
  const entries = Object.entries(bundledModels);
  return (entries.find(([path]) => path.endsWith('/jugador.glb')) ?? entries[0])?.[1] ?? null;
}

/**
 * El .glb preparado, o null si no hay (o si no se pudo leer). Nunca falla:
 * sin modelo, el juego usa el personaje armado por código.
 */
export function loadCharacterLibrary(): Promise<CharacterLibrary | null> {
  if (!cached) {
    const url = characterModelUrl();
    cached = url ? load(url) : Promise.resolve(null);
  }
  return cached;
}

async function load(url: string): Promise<CharacterLibrary | null> {
  try {
    const res = await fetch(url);
    // el servidor de Vite contesta con la página si el archivo no existe: eso no es un modelo
    if (!res.ok || (res.headers.get('content-type') ?? '').includes('text/html')) return null;
    const data = await res.arrayBuffer();
    const gltf = await new GLTFLoader().parseAsync(data, '');
    const template = gltf.scene;
    template.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(template);
    const height = box.max.y - box.min.y;
    const clips = new Map<string, THREE.AnimationClip>();
    for (const clip of gltf.animations) clips.set(clip.name.toLowerCase(), clip);
    return { template, clips, scale: height > 0 ? STREET_CHARACTER.heightM / height : 1 };
  } catch (err) {
    console.warn('[POTRERO] No se pudo cargar el modelo de jugador; se usa el armado por código.', err);
    return null;
  }
}

/** Crea el personaje de un jugador con el modelo que haya. */
export function createCharacter(custom: PlayerCustom, team: TeamColors, lib: CharacterLibrary | null): StreetCharacter {
  return lib ? new GltfCharacter(lib, custom, team) : new ProceduralCharacter(custom, team);
}
