import { useEffect, useState } from 'react';
import { colors } from '../theme';

interface SplashProps {
  logoUrl: string;
  durationMs: number;
  onDone: () => void;
}

export function Splash({ logoUrl, durationMs, onDone }: SplashProps) {
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    const fillTimer = setTimeout(() => setFilled(true), 30);
    const doneTimer = setTimeout(onDone, durationMs);
    return () => {
      clearTimeout(fillTimer);
      clearTimeout(doneTimer);
    };
  }, [durationMs, onDone]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 36,
        background: colors.bg,
      }}
    >
      <img src={logoUrl} alt="Pichanguero" style={{ width: 280, maxWidth: '70vw', height: 'auto' }} />
      <div style={{ width: 320, maxWidth: '70vw', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ height: 4, background: 'rgba(255,255,255,0.12)', borderRadius: 2, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: filled ? '100%' : '0%',
              background: colors.accent,
              transition: `width ${durationMs - 30}ms linear`,
            }}
          />
        </div>
        <span style={{ fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' }}>
          Cargando
        </span>
      </div>
    </div>
  );
}
