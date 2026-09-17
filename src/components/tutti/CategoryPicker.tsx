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

function firstUnused(selected: string[]): string | null {
  const used = new Set(selected);
  const free = TUTTI_CATEGORY_POOL.find((c) => !used.has(c.key));
  return free?.key ?? null;
}

/**
 * The config screen edits categories directly on a preview shaped exactly
 * like the real round table (same corner cell, same header row) — each
 * header cell is itself the dropdown for that column's theme, with its own
 * remove button, plus a trailing "+" header cell to add one. What you see
 * here is what the table looks like once the round starts.
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
      <div style={{ width: '100%', overflowX: 'auto', border: `1px solid ${colors.accent}` }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={cornerCellStyle}>
                <div style={{ fontSize: 9, color: colors.textMuted, fontWeight: 700 }}>RONDA</div>
                <div style={{ fontFamily: fonts.display, fontSize: 22, color: colors.accentLight }}>?</div>
              </th>
              {selected.map((key, index) => {
                const usedElsewhere = new Set(selected.filter((_, i) => i !== index));
                const options = TUTTI_CATEGORY_POOL.filter((c) => c.key === key || !usedElsewhere.has(c.key));
                return (
                  <th key={index} style={headCellStyle}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                      <CustomSelect
                        value={key}
                        options={options.map((c) => ({ value: c.key, label: c.label }))}
                        onChange={(v) => setColumnAt(index, v)}
                      />
                      <button
                        onClick={() => removeAt(index)}
                        disabled={selected.length <= min}
                        title="Quitar columna"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: selected.length <= min ? 'rgba(224,90,90,0.3)' : '#e05a5a',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: selected.length <= min ? 'default' : 'pointer',
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                        }}
                      >
                        ✕ quitar
                      </button>
                    </div>
                  </th>
                );
              })}
              <th style={addCellStyle}>
                <button
                  onClick={addColumn}
                  disabled={selected.length >= max}
                  style={{
                    background: 'none',
                    border: `1px dashed ${selected.length >= max ? 'rgba(255,255,255,0.15)' : colors.accent}`,
                    color: selected.length >= max ? colors.textMuted : colors.accentLight,
                    padding: '10px 14px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: selected.length >= max ? 'default' : 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  + Columna
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={playerCellStyle}>JUGADOR</td>
              {selected.map((_, index) => (
                <td key={index} style={bodyCellStyle}>
                  —
                </td>
              ))}
              <td style={bodyCellStyle} />
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: colors.textMuted }}>
          {selected.length}/{max} columnas · mínimo {min}
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

const GRID_LINE = '1px solid rgba(255,255,255,0.15)';

const cornerCellStyle: CSSProperties = {
  padding: '10px 12px',
  border: GRID_LINE,
  background: 'rgba(47,174,76,0.1)',
  textAlign: 'center',
  verticalAlign: 'middle',
};

const headCellStyle: CSSProperties = {
  padding: '10px 8px',
  border: GRID_LINE,
  background: 'rgba(255,255,255,0.03)',
  textAlign: 'center',
  minWidth: 130,
};

const addCellStyle: CSSProperties = {
  padding: '10px 8px',
  border: GRID_LINE,
  background: 'rgba(0,0,0,0.2)',
  textAlign: 'center',
};

const playerCellStyle: CSSProperties = {
  padding: '10px 16px',
  fontSize: 12,
  fontWeight: 800,
  color: colors.textMuted,
  textTransform: 'uppercase',
  border: GRID_LINE,
  background: 'rgba(255,255,255,0.03)',
  textAlign: 'left',
};

const bodyCellStyle: CSSProperties = {
  padding: '10px 10px',
  fontSize: 13,
  color: colors.textMuted,
  border: GRID_LINE,
  textAlign: 'center',
};
