import { BALL_R, COURT, PLAYER_R } from '../../lib/street/engine';
import type { StreetState } from '../../lib/street/engine';

export interface TeamLook {
  primary: string;
  secondary: string;
}

export function drawStreet(ctx: CanvasRenderingContext2D, s: StreetState, looks: readonly [TeamLook, TeamLook]): void {
  const { w, h, goalTop, goalBottom } = COURT;
  ctx.clearRect(0, 0, w, h);

  // concrete court
  ctx.fillStyle = '#3a3d42';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  for (let x = 0; x < w; x += 40) ctx.fillRect(x, 0, 20, h);

  // markings
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 3;
  ctx.strokeRect(3, 3, w - 6, h - 6);
  ctx.beginPath();
  ctx.moveTo(w / 2, 3);
  ctx.lineTo(w / 2, h - 3);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 54, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeRect(3, goalTop - 40, 96, goalBottom - goalTop + 80);
  ctx.strokeRect(w - 99, goalTop - 40, 96, goalBottom - goalTop + 80);

  // goals
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, goalTop, 7, goalBottom - goalTop);
  ctx.fillRect(w - 7, goalTop, 7, goalBottom - goalTop);
  ctx.strokeStyle = '#f2f2f2';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, goalTop);
  ctx.lineTo(10, goalTop);
  ctx.moveTo(0, goalBottom);
  ctx.lineTo(10, goalBottom);
  ctx.moveTo(w, goalTop);
  ctx.lineTo(w - 10, goalTop);
  ctx.moveTo(w, goalBottom);
  ctx.lineTo(w - 10, goalBottom);
  ctx.stroke();

  // players, back to front so lower ones overlap
  const order = s.players.map((_, i) => i).sort((a, b) => s.players[a].y - s.players[b].y);
  for (const i of order) {
    const p = s.players[i];
    const look = looks[p.team];
    const dashing = p.trickMs > 0;

    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + PLAYER_R * 0.7, PLAYER_R * 0.9, PLAYER_R * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    if (dashing) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(p.x - p.vx * 0.08, p.y - p.vy * 0.08);
      ctx.lineTo(p.x - p.vx * 0.2, p.y - p.vy * 0.2);
      ctx.stroke();
    }

    if (s.crackMs[p.team] > 0) {
      // Modo Crack: the whole team glows
      const glow = ctx.createRadialGradient(p.x, p.y, PLAYER_R * 0.6, p.x, p.y, PLAYER_R * 2.4);
      glow.addColorStop(0, 'rgba(255,214,74,0.55)');
      glow.addColorStop(1, 'rgba(255,214,74,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(p.x, p.y, PLAYER_R * 2.4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    if (p.stunMs > 0) {
      // knocked over by a caño
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.PI / 2.4);
      ctx.translate(-p.x, -p.y);
      ctx.globalAlpha = 0.75;
    }
    ctx.fillStyle = look.primary;
    ctx.beginPath();
    ctx.arc(p.x, p.y, PLAYER_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = look.secondary;
    ctx.stroke();

    // face direction
    ctx.fillStyle = look.secondary;
    ctx.beginPath();
    ctx.arc(p.x + p.fx * 7, p.y + p.fy * 7, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (p.stunMs > 0) {
      ctx.fillStyle = '#ffe14a';
      for (let k = 0; k < 3; k++) {
        const a = performance.now() / 160 + (k * Math.PI * 2) / 3;
        ctx.beginPath();
        ctx.arc(p.x + Math.cos(a) * 13, p.y - PLAYER_R - 6 + Math.sin(a) * 4, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (i === s.controlled[0]) {
      ctx.strokeStyle = '#ffe14a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, PLAYER_R + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffe14a';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - PLAYER_R - 12);
      ctx.lineTo(p.x - 6, p.y - PLAYER_R - 22);
      ctx.lineTo(p.x + 6, p.y - PLAYER_R - 22);
      ctx.closePath();
      ctx.fill();
    }
  }

  // ball
  const b = s.ball;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(b.x, b.y + BALL_R * 0.8, BALL_R, BALL_R * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(b.x, b.y, BALL_R * 0.4, 0, Math.PI * 2);
  ctx.fill();

  // floating labels: ¡Gambeta!, ¡CAÑO!, ¡MODO CRACK!
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const q of s.popups) {
    const t = q.ms / 1100;
    const big = q.text.includes('CRACK');
    ctx.globalAlpha = Math.min(1, t * 2.5);
    ctx.font = `900 ${big ? 34 : 18}px system-ui, sans-serif`;
    ctx.lineWidth = big ? 6 : 4;
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    const y = q.y - (1 - t) * 26;
    ctx.strokeText(q.text, q.x, y);
    ctx.fillStyle = big ? '#ffd64a' : q.team === 0 ? looks[0].primary : looks[1].primary;
    ctx.fillText(q.text, q.x, y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'start';
  ctx.textBaseline = 'alphabetic';
}
