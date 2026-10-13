import { colors } from '../theme';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { useViewport } from '../hooks/useViewport';

/** Invita a instalar Pichanguero como app. Solo aparece en celular y tablet, y si todavía no está instalada. */
export function InstallPrompt() {
  const viewport = useViewport();
  const { canPrompt, showIosSteps, install, dismiss } = useInstallPrompt();

  if (viewport === 'desktop' || !canPrompt) return null;

  return (
    <div
      role="dialog"
      aria-label="Instalar Pichanguero"
      style={{
        position: 'fixed',
        left: 12,
        right: 12,
        bottom: 'calc(12px + env(safe-area-inset-bottom))',
        zIndex: 20,
        maxWidth: 460,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        background: 'rgba(10,10,12,0.96)',
        border: `1px solid ${colors.accent}`,
        boxShadow: '0 0 28px rgba(47,174,76,0.35)',
      }}
    >
      <img src="/icons/icon-192.png" alt="" style={{ width: 48, height: 48, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>Instalá Pichanguero</div>
        <div style={{ fontSize: 12, lineHeight: 1.4, color: colors.textSecondary, marginTop: 2 }}>
          {showIosSteps
            ? 'Tocá Compartir y después "Agregar a inicio" para jugar a pantalla completa.'
            : 'Agregala a tu pantalla de inicio y jugá a pantalla completa.'}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
        {!showIosSteps && (
          <button
            onClick={install}
            style={{
              padding: '8px 14px',
              background: colors.accent,
              border: 'none',
              color: '#fff',
              fontSize: 12,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              cursor: 'pointer',
            }}
          >
            Instalar
          </button>
        )}
        <button
          onClick={dismiss}
          style={{
            padding: '6px 14px',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.25)',
            color: colors.textSecondary,
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          Ahora no
        </button>
      </div>
    </div>
  );
}
