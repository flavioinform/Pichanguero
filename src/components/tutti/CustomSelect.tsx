import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { colors } from '../../theme';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
}

/**
 * A native <select>'s open-state popup can't be themed with CSS — Chrome
 * and friends render it with the OS's own light-mode listbox regardless of
 * inline styles, which is exactly the broken white box this replaces.
 *
 * The option list is portaled to <body> and positioned with `fixed` from
 * the trigger's own bounding rect, rather than a plain absolutely
 * positioned child — the header cell it lives in sits inside the config
 * table's `overflow-x: auto` wrapper, which would otherwise clip the
 * dropdown instead of letting it float over the rest of the page.
 */
export function CustomSelect({ value, options, onChange }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  function openDropdown() {
    const r = buttonRef.current?.getBoundingClientRect();
    if (r) setRect({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 220) });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: MouseEvent) {
      if (buttonRef.current?.contains(e.target as Node) || dropdownRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    function handleScrollOrResize() {
      setOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [open]);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? '';

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => (open ? setOpen(false) : openDropdown())}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          padding: '6px 4px',
          background: 'transparent',
          border: 'none',
          color: '#fff',
          fontSize: 12,
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: 0.2,
          cursor: 'pointer',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedLabel}</span>
        <span style={{ fontSize: 9, color: colors.textMuted, flexShrink: 0 }}>▾</span>
      </button>

      {open &&
        rect &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: rect.top,
              left: rect.left,
              minWidth: rect.width,
              zIndex: 1000,
              background: '#141416',
              border: `1px solid ${colors.accent}`,
              maxHeight: 320,
              overflowY: 'auto',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            }}
          >
            {options.map((o) => {
              const isSelected = o.value === value;
              return (
                <div
                  key={o.value}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  style={{
                    padding: '9px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: isSelected ? colors.accentLight : '#fff',
                    background: isSelected ? 'rgba(47,174,76,0.15)' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    whiteSpace: 'normal',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(47,174,76,0.22)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isSelected ? 'rgba(47,174,76,0.15)' : 'transparent';
                  }}
                >
                  {o.label}
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}
