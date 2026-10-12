import { useRef } from 'react';

interface ThemeSwitcherProps {
  label: string;
  onClick: () => void;
  onUpload: (file: File) => void;
}

const buttonStyle = {
  padding: '6px 14px',
  background: 'rgba(10,10,12,0.7)',
  border: '1px solid rgba(255,255,255,0.25)',
  color: '#c7c7cc',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  cursor: 'pointer',
} as const;

export function ThemeSwitcher({ label, onClick, onUpload }: ThemeSwitcherProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div style={{ position: 'absolute', right: 24, bottom: 16, zIndex: 3, display: 'flex', gap: 8 }}>
      <button onClick={() => inputRef.current?.click()} style={buttonStyle}>
        Subir fondo
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) onUpload(file);
        }}
      />
      <button onClick={onClick} style={buttonStyle}>
        Fondo: {label}
      </button>
    </div>
  );
}
