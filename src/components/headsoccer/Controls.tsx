import type { MutableRefObject, PointerEvent as ReactPointerEvent } from 'react';
import type { Input } from '../../lib/headSoccer/types';

interface ControlsProps {
  inputRef: MutableRefObject<Input>;
  align?: 'left' | 'right';
  /** Tamaño de cada botón en px (más grande en celular). */
  size?: number;
  /** Separa mover (izquierda) de saltar/patear (derecha) ocupando todo el ancho. */
  spread?: boolean;
}

/** On-screen D-pad for touch/mouse play, bound to the same ref-based input
 * state the keyboard listeners write to — so touch and keyboard merge for
 * free without the game loop needing to know which one is being used. */
export function Controls({ inputRef, align = 'left', size = 40, spread = false }: ControlsProps) {
  function set(key: keyof Input, value: boolean) {
    inputRef.current = { ...inputRef.current, [key]: value };
  }

  function pressHandlers(key: keyof Input) {
    return {
      onPointerDown: (e: ReactPointerEvent) => {
        e.preventDefault();
        set(key, true);
      },
      onPointerUp: (e: ReactPointerEvent) => {
        e.preventDefault();
        set(key, false);
      },
      onPointerLeave: () => set(key, false),
      onPointerCancel: () => set(key, false),
    };
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: align === 'right' ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
        justifyContent: spread ? 'space-between' : undefined,
        width: spread ? '100%' : undefined,
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', gap: 6 }}>
        <PadButton size={size} label="◀" {...pressHandlers('left')} />
        <PadButton size={size} label="▶" {...pressHandlers('right')} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <PadButton size={size} label="▲" {...pressHandlers('jump')} />
        <PadButton size={size} label="▼" {...pressHandlers('kick')} />
      </div>
    </div>
  );
}

function PadButton({
  label,
  size,
  ...handlers
}: {
  label: string;
  size: number;
  onPointerDown: (e: ReactPointerEvent) => void;
  onPointerUp: (e: ReactPointerEvent) => void;
  onPointerLeave: () => void;
  onPointerCancel: () => void;
}) {
  return (
    <button
      {...handlers}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'rgba(10,15,12,0.78)',
        border: '1px solid rgba(255,255,255,0.3)',
        color: '#fff',
        fontSize: size >= 52 ? 22 : 16,
        touchAction: 'none',
        userSelect: 'none',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}
