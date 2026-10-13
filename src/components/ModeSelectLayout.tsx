import type { ReactNode } from 'react';
import { colors, fonts } from '../theme';
import { useViewport } from '../hooks/useViewport';

interface ModeSelectLayoutProps {
  title: string;
  onBack?: () => void;
  backLabel?: string;
  children: ReactNode;
}

/** Pantalla de elegir modo (online / offline / etc.): título, tarjetas y "Volver al menú".
 * Las tarjetas van en fila en escritorio y se apilan en celular; si no entra, se desplaza. */
export function ModeSelectLayout({ title, onBack, backLabel = 'Volver al menú', children }: ModeSelectLayoutProps) {
  const viewport = useViewport();
  const mobile = viewport === 'mobile';

  return (
    <div
      style={{
        position: 'relative',
        zIndex: 2,
        width: '100%',
        height: '100%',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          margin: 'auto 0',
          padding: mobile ? '32px 16px' : '32px 24px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: mobile ? 24 : 40,
        }}
      >
        <h1
          style={{
            fontFamily: fonts.display,
            fontSize: mobile ? 34 : 48,
            margin: 0,
            color: '#fff',
            textAlign: 'center',
            textTransform: 'uppercase',
            textShadow: '0 2px 18px rgba(0,0,0,0.6)',
          }}
        >
          {title}
        </h1>

        <div
          style={{
            display: 'flex',
            flexDirection: mobile ? 'column' : 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'stretch',
            gap: mobile ? 14 : 28,
            width: mobile ? '100%' : undefined,
            maxWidth: mobile ? 420 : undefined,
          }}
        >
          {children}
        </div>

        {onBack && (
          <button
            onClick={onBack}
            style={{
              padding: '10px 24px',
              background: 'none',
              border: '1px solid rgba(255,255,255,0.25)',
              color: colors.textSecondary,
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: 0.5,
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            {backLabel}
          </button>
        )}
      </div>
    </div>
  );
}
