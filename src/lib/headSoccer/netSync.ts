import type { GameState } from './types';

/**
 * Brings a follower's local simulation back in line with the host's
 * authoritative snapshot. Everything comes from the snapshot (ball, score,
 * clock, the other player) except the follower's own player, which keeps its
 * locally predicted position while it's close enough: the host sees that
 * player's input a few tens of milliseconds late, and snapping them back to
 * that older spot on every snapshot would feel like rubber-banding.
 */
export function mergeSnapshot(local: GameState, snapshot: GameState, selfIndex: 0 | 1, tolerancePx: number): GameState {
  const mine = local.players[selfIndex];
  const theirs = snapshot.players[selfIndex];
  const close = Math.abs(mine.x - theirs.x) <= tolerancePx && Math.abs(mine.y - theirs.y) <= tolerancePx;
  if (!close) return snapshot;

  const players = [...snapshot.players] as GameState['players'];
  players[selfIndex] = mine;
  return { ...snapshot, players };
}
