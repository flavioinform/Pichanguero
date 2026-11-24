import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import type { StreetTeam } from '../../../lib/street/team';
import type { PreviewAction, PreviewMode, TeamPreviewScene } from '../previewScene';
import { MiniAvatar } from './ui';

interface TeamPreview3dProps {
  team: StreetTeam;
  slot: number;
  mode?: PreviewMode;
  /** cambia `nonce` para volver a disparar la celebración o el gesto */
  action?: { kind: PreviewAction; nonce: number } | null;
}

/** La vista previa 3D. Three.js se baja recién cuando se abre esta pantalla y se arrastra para girar. */
export function TeamPreview3d({ team, slot, mode = 'single', action }: TeamPreview3dProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<TeamPreviewScene | null>(null);
  const latest = useRef({ team, slot });
  latest.current = { team, slot };
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let raf = 0;
    let observer: ResizeObserver | null = null;

    // el modelo de jugador (si hay .glb) y la escena se bajan juntos; después se arma todo de una vez, sin parpadeos
    Promise.all([import('../previewScene'), import('../characters/library').then((m) => m.loadCharacterLibrary())])
      .then(([{ TeamPreviewScene: Scene }, library]) => {
        if (cancelled) return;
        const scene = new Scene(canvas, mode, library);
        sceneRef.current = scene;
        scene.setTeam(latest.current.team, latest.current.slot);
        const fit = () => scene.resize(canvas.clientWidth, canvas.clientHeight);
        fit();
        observer = new ResizeObserver(fit);
        observer.observe(canvas);
        let last = performance.now();
        const frame = (now: number) => {
          scene.render(now - last);
          last = now;
          raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      observer?.disconnect();
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, [mode]);

  useEffect(() => {
    sceneRef.current?.setTeam(team, slot);
  }, [team, slot]);

  useEffect(() => {
    if (action) sceneRef.current?.play(action.kind);
  }, [action]);

  // arrastrar con el mouse o el dedo gira al jugador
  const drag = useRef<{ x: number } | null>(null);
  const onDown = (e: ReactPointerEvent) => {
    drag.current = { x: e.clientX };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: ReactPointerEvent) => {
    if (!drag.current) return;
    sceneRef.current?.rotateBy((e.clientX - drag.current.x) * 0.012);
    drag.current.x = e.clientX;
  };
  const onUp = () => {
    drag.current = null;
  };
  // con el teclado se puede girar con las flechas izquierda y derecha
  const onKey = (e: ReactKeyboardEvent) => {
    if (e.key === 'ArrowLeft') sceneRef.current?.rotateBy(-0.25);
    if (e.key === 'ArrowRight') sceneRef.current?.rotateBy(0.25);
  };

  if (failed) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100%', gap: 10, textAlign: 'center' }}>
        <MiniAvatar player={team.players[slot]} team={team} size={140} />
        <p className="pm-small pm-dim" style={{ maxWidth: 260 }}>
          Tu navegador no pudo mostrar la vista 3D. Podés seguir armando el equipo igual.
        </p>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      tabIndex={0}
      role="img"
      aria-label="Vista previa 3D del jugador. Arrastrá para girarlo, o usá las flechas izquierda y derecha."
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onKeyDown={onKey}
      style={{ width: '100%', height: '100%', display: 'block', cursor: 'grab', touchAction: 'pan-y' }}
    />
  );
}
