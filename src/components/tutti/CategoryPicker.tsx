import type { CSSProperties } from 'react';
import { colors, fonts } from '../../theme';
import { TUTTI_CATEGORY_POOL } from '../../data/tuttiCategories';
import { CustomSelect } from './CustomSelect';

interface CategoryPickerProps {
  selected: string[];
  onChange: (keys: string[]) => void;
  min?: number;
  max?: number;
}

/** Same width as the round sheet's category columns, so the preview here
 * matches the real table column for column. */
const COLUMN_WIDTH = 172;

function firstUnused(selected: string[]): string | null {
  const used = new Set(selected);
  const free = TUTTI_CATEGORY_POOL.find((c) => !used.has(c.key));
  return free?.key ?? null;
}

/**
 * Categories laid out across, like the round sheet. Each column is a dropdown
 * with its own remove button, and the sheet scrolls sideways when there are
 * more columns than fit.
 */
export function CategoryPicker({ selected, onChange, min = 4, max = TUTTI_CATEGORY_POOL.length }: CategoryPickerProps) {
  function setColumnAt(index: number, key: string) {
    const next = [...selected];
    next[index] = key;
    onChange(next);
  }

  function removeAt(index: number) {
    if (selected.length <= min) return;
    onChange(selected.filter((_, i) => i !== index));
  }

  function addColumn() {
    if (selected.length >= max) return;
    const next = firstUnused(selected);
    if (next) onChange([...selected, next]);
  }

  function shuffleAll() {
    const shuffled = [...TUTTI_CATEGORY_POOL].sort(() => Math.random() - 0.5);
    onChange(shuffled.slice(0, selected.length).map((c) => c.key));
  }

  const full = selected.length >= max;
  const atMin = selected.length <= min;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', minWidth: 0 }}>
      <div style={{ width: '100%', overflowX: 'auto', border: `1px solid ${colors.accent}`, background: colors.surface }}>
        <div style={{ display: 'flex', width: 'max-content' }}>
          <div style={{ ...cell, width: 56, justifyContent: 'center', background: 'rgba(47,174,76,0.1)' }}>
            <span style={{ fontSize: 10, color: colors.textMuted, fontWeight: 700 }}>RONDA</span>
            <span style={{ fontFamily: fonts.display, fontSize: 22, color: colors.accentLight }}>?</span>
          </div>

          {selected.map((key, index) => {
            const usedElsewhere = new Set(selected.filter((_, i) => i !== index));
            const options = TUTTI_CATEGORY_POOL.filter((c) => c.key === key || !usedElsewhere.has(c.key));
            return (
              <div key={index} style={{ ...cell, width: COLUMN_WIDTH, background: 'rgba(255,255,255,0.03)' }}>
                <span style={{ fontSize: 10, color: colors.textMuted, fontWeight: 700 }}>{index + 1}</span>
                <CustomSelect
                  value={key}
                  options={options.map((c) => ({ value: c.key, label: c.label }))}
                  onChange={(v) => setColumnAt(index, v)}
                />
                <button
                  onClick={() => removeAt(index)}
                  disabled={atMin}
                  title="Quitar categoría"
                  style={{
                    ...removeStyle,
                    opacity: atMin ? 0.35 : 1,
                    cursor: atMin ? 'default' : 'pointer',
                  }}
                >
                  ✕ quitar
                </button>
              </div>
            );
          })}

          <div style={{ ...cell, width: COLUMN_WIDTH, justifyContent: 'center', background: 'rgba(0,0,0,0.2)' }}>
            <button
              onClick={addColumn}
              disabled={full}
              style={{
                background: 'none',
                border: `1px dashed ${full ? colors.borderStrong : colors.accent}`,
                color: full ? colors.textMuted : colors.accentLight,
                padding: '10px 14px',
                fontSize: 12,
                fontWeight: 800,
                cursor: full ? 'default' : 'pointer',
                whiteSpace: 'nowrap',
                textTransform: 'uppercase',
              }}
            >
              + Columna
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: colors.textMuted }}>
          {selected.length}/{max} columnas · mínimo {min}
          {selected.length > 6 ? ' · deslizá para ver todas' : ''}
        </span>
        <button
          onClick={shuffleAll}
          style={{
            padding: '8px 16px',
            background: 'rgba(47,174,76,0.12)',
            border: `1px solid ${colors.accent}`,
            color: colors.accentLight,
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          🎲 Randomizar
        </button>
      </div>
    </div>
  );
}

const cell: CSSProperties = {
  flexShrink: 0,
  padding: '12px 10px',
  borderLeft: `1px solid ${colors.border}`,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  minHeight: 110,
  boxSizing: 'border-box',
};

const removeStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  color: colors.danger,
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  padding: '2px 4px',
};
