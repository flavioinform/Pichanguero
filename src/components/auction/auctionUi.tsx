import type { ReactNode } from 'react';
import { colors, fonts } from '../../theme';

export function CenteredCard({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div
      style={{
        position: 'relative',
        zIndex: 2,
        width: '100%',
        height: '100%',
        display: 'flex',
        overflowY: 'auto',
        padding: '24px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          margin: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
          padding: '32px clamp(18px, 5vw, 44px)',
          background: 'rgba(12,12,14,0.92)',
          borderTop: `3px solid ${colors.accent}`,
          borderLeft: '1px solid rgba(255,255,255,0.12)',
          borderRight: '1px solid rgba(255,255,255,0.12)',
          borderBottom: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 0 60px rgba(0,0,0,0.5)',
          maxWidth: wide ? 760 : 560,
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function CenteredMessage({ text }: { text: string }) {
  return (
    <CenteredCard>
      <div style={{ color: colors.textSecondary, fontSize: 15 }}>{text}</div>
    </CenteredCard>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return (
    <h1 style={{ fontFamily: fonts.display, fontSize: 'clamp(26px, 8vw, 36px)', margin: 0, color: '#fff', textTransform: 'uppercase', textAlign: 'center' }}>
      {children}
    </h1>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        alignSelf: 'flex-start',
        fontSize: 12,
        fontWeight: 800,
        color: colors.accentLight,
        textTransform: 'uppercase',
        letterSpacing: 1,
        borderTop: '1px solid rgba(255,255,255,0.12)',
        width: '100%',
        paddingTop: 18,
        marginTop: -2,
      }}
    >
      {children}
    </div>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  onEnter,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  onEnter: () => void;
}) {
  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && onEnter()}
      placeholder={placeholder}
      style={{
        padding: '12px 16px',
        fontSize: 16,
        background: colors.surfaceRaised,
        border: `1px solid ${colors.accent}`,
        color: '#fff',
        fontFamily: fonts.body,
        minWidth: 'min(260px, 100%)',
        maxWidth: '100%',
        textAlign: 'center',
      }}
    />
  );
}

export function PrimaryButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '14px 34px',
        background: colors.accent,
        border: 'none',
        color: '#fff',
        fontWeight: 800,
        fontSize: 15,
        letterSpacing: 1,
        textTransform: 'uppercase',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        minWidth: 'min(220px, 100%)',
      }}
    >
      {label}
    </button>
  );
}

export function SecondaryButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
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
      {label}
    </button>
  );
}

export function ErrorText({ text }: { text: string }) {
  return <div style={{ color: colors.danger, fontSize: 14, textAlign: 'center' }}>{text}</div>;
}
