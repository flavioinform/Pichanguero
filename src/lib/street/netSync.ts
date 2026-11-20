import type { StreetInput, StreetState } from './engine';

/** What the host broadcasts: the whole match, plus the keys the host is
 * holding so the guest can keep predicting the host's player between snapshots. */
export interface StreetSnapshot {
  state: StreetState;
  hostInput: StreetInput;
}

/**
 * Brings the guest's local simulation back in line with the host's snapshot.
 * Everything comes from the host except what only the guest knows right now:
 * the keys they are holding (so a loaded shot isn't lost) and, while it is
 * close enough, where their own player is. The host sees the guest's input a
 * little late, and snapping that player back on every snapshot would feel
 * like rubber-banding.
 */
export function mergeStreetSnapshot(local: StreetState, snapshot: StreetState, team: 0 | 1, tolerancePx: number): StreetState {
  const merged: StreetState = {
    ...snapshot,
    authoritative: local.authoritative,
    prev: [...snapshot.prev],
    chargeMs: [...snapshot.chargeMs],
    controlled: [...snapshot.controlled],
    switchLockMs: [...snapshot.switchLockMs],
  };
  merged.prev[team] = local.prev[team];
  merged.chargeMs[team] = local.chargeMs[team];
  // a switch the guest just made by hand hasn't reached the host yet: keep it
  if (local.switchLockMs[team] > 0 && local.switchLockMs[team] > snapshot.switchLockMs[team]) {
    merged.controlled[team] = local.controlled[team];
    merged.switchLockMs[team] = local.switchLockMs[team];
  }

  const index = merged.controlled[team];
  if (index >= 0 && index === local.controlled[team]) {
    const mine = local.players[index];
    const theirs = snapshot.players[index];
    if (Math.abs(mine.x - theirs.x) <= tolerancePx && Math.abs(mine.y - theirs.y) <= tolerancePx) {
      merged.players = [...snapshot.players];
      merged.players[index] = { ...theirs, x: mine.x, y: mine.y, vx: mine.vx, vy: mine.vy, fx: mine.fx, fy: mine.fy };
    }
  }
  return merged;
}
