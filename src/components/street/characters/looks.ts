/**
 * Lo que hace que los jugadores se lean bien sobre el fondo de edificios: un
 * contorno oscuro fino y una luz de borde (rim light) del color del equipo.
 * Sirve para el personaje procedural y para el .glb.
 */
import * as THREE from 'three';

/** grosor del contorno, en metros del modelo */
const OUTLINE_WIDTH = 0.012;
/** qué tan fuerte es la luz de borde y qué tan finita (más alto = más finita) */
const RIM_STRENGTH = 0.85;
const RIM_POWER = 2.6;

/** Material del contorno: dibuja solo las caras de atrás, empujadas un poco hacia afuera. Funciona también con esqueleto. */
export const outlineMaterial = (() => {
  const m = new THREE.MeshBasicMaterial({ color: '#0b0d11', side: THREE.BackSide });
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>\n  transformed += normalize(normal) * ${OUTLINE_WIDTH.toFixed(4)};`
    );
  };
  m.customProgramCacheKey = () => 'potrero-outline';
  return m;
})();

/** Agrega el contorno a una malla del .glb (con o sin esqueleto) sin duplicar su geometría. */
export function addOutline(mesh: THREE.Mesh): THREE.Mesh {
  let shell: THREE.Mesh;
  if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) {
    // con esqueleto: el contorno usa los mismos huesos, así se dobla igual que el cuerpo
    const source = mesh as THREE.SkinnedMesh;
    const skinnedShell = new THREE.SkinnedMesh(mesh.geometry, outlineMaterial);
    skinnedShell.bind(source.skeleton, source.bindMatrix);
    shell = skinnedShell;
  } else {
    shell = new THREE.Mesh(mesh.geometry, outlineMaterial);
  }
  shell.position.copy(mesh.position);
  shell.quaternion.copy(mesh.quaternion);
  shell.scale.copy(mesh.scale);
  shell.name = `${mesh.name}__outline`;
  shell.renderOrder = -1;
  mesh.parent?.add(shell);
  return shell;
}

/** Suma una luz de borde del color dado: los costados del jugador brillan con el color de su equipo. */
export function addRim<T extends THREE.Material>(material: T, color: string): T {
  const rimColor = new THREE.Color(color);
  material.onBeforeCompile = (shader) => {
    shader.uniforms.rimColor = { value: rimColor };
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', 'uniform vec3 rimColor;\nvoid main() {')
      .replace(
        '#include <opaque_fragment>',
        `float rimLight = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), ${RIM_POWER.toFixed(2)});
  outgoingLight += rimColor * rimLight * ${RIM_STRENGTH.toFixed(2)};
  #include <opaque_fragment>`
      );
  };
  // el mismo programa de GPU sirve para todos los colores: el color va como uniform
  material.customProgramCacheKey = () => `potrero-rim-${material.type}`;
  return material;
}

/**
 * Dónde está cada cosa en un modelo de una sola textura (ver STREET_CHARACTER.colorKey).
 * Las alturas van de 0 (pies) a 1 (cabeza) y los anchos se miden en alturas del jugador.
 */
export interface ColorKeyConfig {
  /** franja de altura donde está la remera */
  jersey: [number, number];
  /** franja donde está el short (tal como viene en la textura) */
  shorts: [number, number];
  /** hasta qué saturación un píxel cuenta como "tela gris" (la piel y el pelo tienen más color) */
  maxSat: number;
  /** brillo típico (lineal) en la textura de la remera, el short, la piel y el pelo: se conserva el sombreado relativo */
  jerseyRef: number;
  shortsRef: number;
  skinRef: number;
  hairRef: number;
  /** desde qué distancia al centro del cuerpo empiezan los brazos (el modelo está en pose "A") */
  armX: number;
  /** desde qué altura puede haber pelo, y hasta qué brillo un píxel cuenta como pelo */
  hairFrom: number;
  hairLum: number;
  /** altura del tobillo: lo de abajo es el pie (va de color zapatilla) */
  ankle: number;
  /** dónde termina abajo el short según su largo */
  shortsBottom: { corto: number; medio: number; largo: number };
  /** hasta dónde suben las medias según el tipo */
  socksTop: { altas: number; bajas: number };
  /** barba: franja de altura de la mandíbula, y cuánto hacia atrás de la punta de la cara llega (en alturas) */
  beard: { from: number; to: number; depth: number };
}

/** Los colores y cortes de un jugador. */
export interface ColorKeyLook {
  jersey: string;
  shorts: string;
  skin: string;
  hair: string;
  socks: string;
  shoes: string;
  /** mangas cortadas: los brazos quedan al aire */
  sleeveless: boolean;
  shortsLength: 'corto' | 'medio' | 'largo';
  socksType: 'altas' | 'bajas';
  /** pelo al ras (rapado, y los costados de la cresta) */
  buzz: boolean;
  beard: boolean;
  /** dónde está la punta de la cara (z en la pose de reposo), para ubicar la barba */
  faceZ: number;
}

/** La punta de la cara de una malla: el punto más adelantado a la altura de la boca. Se calcula una vez por malla. */
const faceZCache = new WeakMap<THREE.BufferGeometry, number>();
export function faceFrontZ(geometry: THREE.BufferGeometry, key: ColorKeyConfig): number {
  const cached = faceZCache.get(geometry);
  if (cached !== undefined) return cached;
  if (!geometry.boundingBox) geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const size = box.max.y - box.min.y;
  const pos = geometry.attributes.position;
  let z = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    const h = (pos.getY(i) - box.min.y) / size;
    if (h >= key.beard.from && h <= key.beard.to) z = Math.max(z, pos.getZ(i));
  }
  const result = Number.isFinite(z) ? z : box.max.z;
  faceZCache.set(geometry, result);
  return result;
}

/**
 * Recolorea un modelo de una sola textura: la piel toma el tono del jugador,
 * el pelo su color, la tela gris de la remera y el short los colores del
 * equipo, y se pintan medias y el pie. Las mangas y el largo del short se
 * cortan por altura. Se mantiene el sombreado de la textura.
 * Se encadena con la luz de borde (llamar después de addRim).
 */
export function addColorKey<T extends THREE.Material>(material: T, key: ColorKeyConfig, box: THREE.Box3, look: ColorKeyLook): T {
  const prev = material.onBeforeCompile;
  const prevKey = material.customProgramCacheKey();
  const color = (c: string) => ({ value: new THREE.Color(c) });
  material.onBeforeCompile = (shader, renderer) => {
    prev.call(material, shader, renderer);
    Object.assign(shader.uniforms, {
      keyJersey: color(look.jersey),
      keyShorts: color(look.shorts),
      keySkin: color(look.skin),
      keyHairColor: color(look.hair),
      keySocks: color(look.socks),
      keyShoe: color(look.shoes),
      keyBands: { value: new THREE.Vector4(key.jersey[0], key.jersey[1], key.shorts[0], key.shorts[1]) },
      keyInfo: { value: new THREE.Vector4(box.min.y, box.max.y, key.maxSat, (box.min.x + box.max.x) / 2) },
      keyRefs: { value: new THREE.Vector4(key.jerseyRef, key.shortsRef, key.skinRef, key.hairRef) },
      keyHair: { value: new THREE.Vector2(key.hairFrom, key.hairLum) },
      keyLegs: { value: new THREE.Vector4(key.shortsBottom[look.shortsLength], key.socksTop[look.socksType], key.ankle, key.armX) },
      keySleeve: { value: look.sleeveless ? 1 : 0 },
      keyBuzz: { value: look.buzz ? 1 : 0 },
      keyBeard: { value: new THREE.Vector4(key.beard.from, key.beard.to, look.faceZ - key.beard.depth * (box.max.y - box.min.y), look.beard ? 1 : 0) },
    });
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', 'varying vec3 vKeyPos;\nvoid main() {')
      // la posición en la pose de reposo: la remera sigue siendo remera aunque el brazo se levante
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vKeyPos = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        'void main() {',
        `uniform vec3 keyJersey, keyShorts, keySkin, keyHairColor, keySocks, keyShoe;
uniform vec4 keyBands, keyInfo, keyRefs, keyLegs, keyBeard;
uniform vec2 keyHair;
uniform float keySleeve, keyBuzz;
varying vec3 vKeyPos;
float kBand(float h, float a, float b) { return smoothstep(a - 0.006, a + 0.006, h) * (1.0 - smoothstep(b - 0.006, b + 0.006, h)); }
void main() {`
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
  {
    vec3 kc = diffuseColor.rgb;
    float kMax = max(kc.r, max(kc.g, kc.b));
    float kSat = (kMax - min(kc.r, min(kc.g, kc.b))) / max(kMax, 0.001);
    float kLum = dot(kc, vec3(0.2126, 0.7152, 0.0722));
    float kGrey = 1.0 - smoothstep(keyInfo.z * 0.6, keyInfo.z, kSat);
    float kSize = keyInfo.y - keyInfo.x;
    float kh = (vKeyPos.y - keyInfo.x) / kSize;
    float kArm = smoothstep(keyLegs.w - 0.01, keyLegs.w + 0.01, abs(vKeyPos.x - keyInfo.w) / kSize);
    // el sombreado de la textura se conserva, suavizado para que las vetas no se vuelvan manchas
    vec3 kSkin = keySkin * clamp(sqrt(kLum / keyRefs.z), 0.55, 1.2);
    vec3 kOut = kc;
    // piel y pelo: lo que tiene color propio; el pelo es lo oscuro de la cabeza
    float kHairM = step(keyHair.x, kh) * (1.0 - smoothstep(keyHair.y * 0.7, keyHair.y, kLum));
    kOut = mix(kOut, kSkin, (1.0 - kGrey) * (1.0 - kHairM));
    // al ras: se ve la piel a través del pelo
    vec3 kHairC = keyHairColor * clamp(sqrt(kLum / keyRefs.w), 0.6, 1.4);
    kHairC = mix(kHairC, mix(keySkin * 0.85, keyHairColor, 0.45), keyBuzz);
    kOut = mix(kOut, kHairC, kHairM);
    // barba: la mandíbula, solo la parte de adelante de la cara
    float kBeardM = keyBeard.w * (1.0 - kHairM) * (1.0 - kGrey) * kBand(kh, keyBeard.x, keyBeard.y) * smoothstep(keyBeard.z, keyBeard.z + 0.01 * kSize, vKeyPos.z);
    // un poco de ruido para que parezca pelo y no una mancha
    float kGrain = fract(sin(dot(vKeyPos.xy, vec2(127.1, 311.7))) * 43758.5);
    // la barba conserva el sombreado de la cara y deja ver un poco la piel
    kOut = mix(kOut, keyHairColor * clamp(sqrt(kLum / keyRefs.z), 0.6, 1.2) * (0.75 + 0.5 * kGrain), kBeardM * 0.75);
    // remera; con mangas cortadas, la parte de los brazos pasa a ser piel
    float kJ = kGrey * kBand(kh, keyBands.x, keyBands.y);
    vec3 kJersey = keyJersey * clamp(sqrt(kLum / keyRefs.x), 0.55, 1.15);
    vec3 kArmSkin = keySkin * clamp(sqrt(kLum / keyRefs.x), 0.6, 1.1);
    kOut = mix(kOut, mix(kJersey, kArmSkin, keySleeve * kArm), kJ);
    // short: del largo elegido hasta la cintura; la tela que sobra abajo pasa a ser pierna
    float kLeg = (1.0 - kArm) * kBand(kh, keyLegs.x, keyBands.w);
    float kShortsCloth = kGrey * kBand(kh, keyBands.z, keyBands.w);
    vec3 kLegSkin = keySkin * clamp(sqrt(kLum / keyRefs.y), 0.55, 1.0);
    kOut = mix(kOut, kLegSkin, kShortsCloth * (1.0 - kLeg));
    kOut = mix(kOut, keyShorts * clamp(sqrt(kLum / mix(keyRefs.z, keyRefs.y, kGrey)), 0.55, 1.15), kLeg);
    // medias y pie
    float kSock = (1.0 - kArm) * kBand(kh, keyLegs.z, keyLegs.y);
    kOut = mix(kOut, keySocks * clamp(sqrt(kLum / keyRefs.z), 0.6, 1.15), kSock);
    kOut = mix(kOut, keyShoe * clamp(sqrt(kLum / keyRefs.z), 0.6, 1.15), (1.0 - kArm) * (1.0 - smoothstep(keyLegs.z - 0.006, keyLegs.z + 0.006, kh)));
    diffuseColor.rgb = kOut;
  }`
      );
  };
  material.customProgramCacheKey = () => `${prevKey}-colorkey`;
  return material;
}
