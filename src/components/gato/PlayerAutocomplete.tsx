import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { colors, fonts } from '../../theme';
import { searchPlayers, type PlayerSuggestion } from '../../lib/playerSearch';

interface PlayerAutocompleteProps {
  /** Fires with a confirmed player name (picked from real data), or null
   * once the text no longer matches that confirmed pick. */
  onChange: (name: string | null) => void;
  disabled?: boolean;
  onSubmit?: () => void;
}

const DEBOUNCE_MS = 200;

export function PlayerAutocomplete({ onChange, disabled, onSubmit }: PlayerAutocompleteProps) {
  const [text, setText] = useState('');
  const [suggestions, setSuggestions] = useState<PlayerSuggestion[]>([]);
  const [highlighted, setHighlighted] = useState(0);
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (confirmed && text === confirmed) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchPlayers(text);
        setSuggestions(results);
        setHighlighted(0);
      } catch {
        setSuggestions([]);
      }
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  function selectSuggestion(name: string) {
    setText(name);
    setConfirmed(name);
    setSuggestions([]);
    onChange(name);
  }

  function handleTextChange(value: string) {
    setText(value);
    if (confirmed && value !== confirmed) {
      setConfirmed(null);
      onChange(null);
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      selectSuggestion(suggestions[highlighted].name);
    } else if (e.key === 'Escape') {
      setSuggestions([]);
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        autoFocus
        value={text}
        disabled={disabled}
        onChange={(e) => handleTextChange(e.target.value)}
        onKeyDown={(e) => {
          if (suggestions.length > 0) handleKeyDown(e);
          else if (e.key === 'Enter') onSubmit?.();
        }}
        placeholder="Nombre del jugador…"
        style={{
          padding: '10px 14px',
          fontSize: 15,
          background: 'rgba(18,18,20,0.8)',
          border: `1px solid ${confirmed ? colors.accent : 'rgba(255,255,255,0.25)'}`,
          color: '#fff',
          fontFamily: fonts.body,
          minWidth: 260,
        }}
      />
      {suggestions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            background: '#141416',
            border: '1px solid rgba(255,255,255,0.2)',
            zIndex: 10,
            maxHeight: 220,
            overflowY: 'auto',
          }}
        >
          {suggestions.map((p, i) => (
            <div
              key={p.id}
              onMouseDown={() => selectSuggestion(p.name)}
              onMouseEnter={() => setHighlighted(i)}
              style={{
                padding: '8px 14px',
                fontSize: 14,
                color: '#fff',
                background: i === highlighted ? 'rgba(47,174,76,0.25)' : 'transparent',
                cursor: 'pointer',
              }}
            >
              {p.name}
            </div>
          ))}
        </div>
      )}
      {!confirmed && text.trim().length >= 2 && suggestions.length === 0 && (
        <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
          Sin coincidencias en la base de datos.
        </div>
      )}
    </div>
  );
}
