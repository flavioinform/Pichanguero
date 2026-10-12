import type { GameState, Input } from './types';

const CHASE_DEADZONE = 14;
const JUMP_TRIGGER_DIST = 90;
const JUMP_TRIGGER_HEIGHT = 40;
const KICK_RANGE = 85;

/** Single reactive CPU difficulty for the MVP: chase the ball's x position,
 * jump when it's close and above, kick when in range. Produces the same
 * `Input` shape a keyboard player would, so `physics.step` treats it
 * identically — more difficulty levels later are just more functions like
 * this one, no changes needed to the physics engine itself. */
export function getCpuInput(state: GameState, cpuIndex: 0 | 1): Input {
  const me = state.players[cpuIndex];
  const ball = state.ball;
  const dx = ball.x - me.x;
  const dy = me.y - ball.y; // positive when ball is above the player's head

  const input: Input = { left: false, right: false, jump: false, kick: false };

  if (dx > CHASE_DEADZONE) input.right = true;
  else if (dx < -CHASE_DEADZONE) input.left = true;

  if (me.grounded && Math.abs(dx) < JUMP_TRIGGER_DIST && dy > JUMP_TRIGGER_HEIGHT) {
    input.jump = true;
  }

  const dist = Math.hypot(dx, ball.y - me.y);
  if (dist < KICK_RANGE && me.kickCooldownMs <= 0) {
    input.kick = true;
  }

  return input;
}
