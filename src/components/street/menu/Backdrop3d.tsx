import { useEffect, useRef } from 'react';
import { createStreetState } from '../../../lib/street/engine';
import type { StreetTeam } from '../../../lib/street/team';

/** La cancha de noche como fondo del menú principal, con la cámara meciéndose despacio. Three.js se baja recién acá. */
export function Backdrop3d({ teams }: { teams: readonly [StreetTeam, StreetTeam] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const teamsRef = useRef(teams);
  teamsRef.current = teams;

  useEffect(() => {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas || !overlay) return;
    let cancelled = false;
    let raf = 0;
    let observer: ResizeObserver | null = null;
    let dispose: (() => void) | null = null;

    Promise.all([import('../scene3d'), import('../characters/library').then((m) => m.loadCharacterLibrary())])
      .then(([{ StreetScene }, library]) => {
        if (cancelled) return;
        const scene = new StreetScene(canvas, overlay, teamsRef.current, 0, library);
        scene.setBackdrop(true);
        // un partido quieto, sin intro: los jugadores esperan el saque
        const state = createStreetState('normal', 5, 180000, false, false);
        const fit = () => scene.resize(canvas.clientWidth, canvas.clientHeight);
        fit();
        observer = new ResizeObserver(fit);
        observer.observe(canvas);
        let last = performance.now();
        const frame = (now: number) => {
          scene.render(state, now - last);
          last = now;
          raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
        dispose = () => scene.dispose();
      })
      .catch(() => {
        // sin WebGL el menú queda sobre el fondo liso
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      observer?.disconnect();
      dispose?.();
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
      <div ref={overlayRef} aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
    </>
  );
}
