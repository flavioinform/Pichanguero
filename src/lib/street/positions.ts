/** Dónde están los seis jugadores y la pelota, en un arreglo plano. Lo usan el partido y la escena 3D para dibujar entre paso y paso. */
import type { StreetState } from './engine';

/** positions are packed as [x0, y0, x1, y1, ...]: the six players, then the ball (engine pixels) */
export const POSITION_SLOTS = 14;

/** Where every player and the ball are, in the layout `POSITION_SLOTS` describes. */
export function readPositions(s: StreetState, out: Float32Array<ArrayBuffer> = new Float32Array(POSITION_SLOTS)): Float32Array<ArrayBuffer> {
  s.players.forEach((p, i) => {
    out[i * 2] = p.x;
    out[i * 2 + 1] = p.y;
  });
  out[12] = s.ball.x;
  out[13] = s.ball.y;
  return out;
}
