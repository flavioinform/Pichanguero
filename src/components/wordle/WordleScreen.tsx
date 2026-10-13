import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { colors, fonts } from '../../theme';
import { BackArrowIcon } from '../../icons/BackArrowIcon';
import {
  MAX_GUESSES,
  WORD_LENGTH,
  dateKeyUtc,
  evaluateGuess,
  fetchPlayerImage,
  getDailyTarget,
  isValidWord,
  loadDayRecord,
  loadStats,
  recordFinish,
  saveDayRecord,
  type LetterStatus,
  type Stats,
  type Target,
} from '../../lib/wordleGame';

interface WordleScreenProps {
  onBack: () => void;
}

const KEYBOARD_ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['enter', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'bksp'],
];

const STATUS_RANK: Record<LetterStatus, number> = { absent: 0, present: 1, correct: 2 };

const TILE_COLORS: Record<LetterStatus | 'pending' | 'empty', CSSProperties> = {
  correct: { background: '#2fae4c', borderColor: '#2fae4c', color: '#fff' },
  present: { background: '#c9a53b', borderColor: '#c9a53b', color: '#fff' },
  absent: { background: '#3a3a3e', borderColor: '#3a3a3e', color: '#fff' },
  pending: { background: 'transparent', borderColor: 'rgba(255,255,255,0.45)', color: '#fff' },
  empty: { background: 'transparent', borderColor: 'rgba(255,255,255,0.15)', color: '#fff' },
};

export function WordleScreen({ onBack }: WordleScreenProps) {
  const [dateKey] = useState(dateKeyUtc);
  const [target] = useState<Target>(() => getDailyTarget(dateKey));
  const [guesses, setGuesses] = useState<string[]>(() => loadDayRecord(dateKey).guesses);
  const [current, setCurrent] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [stats, setStats] = useState<Stats>(loadStats);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const won = guesses.includes(target.word);
  const done = won || guesses.length >= MAX_GUESSES;

  const keyStatus = useMemo(() => {
    const map: Record<string, LetterStatus> = {};
    for (const guess of guesses) {
      evaluateGuess(guess, target.word).forEach((status, i) => {
        const letter = guess[i].toLowerCase();
        if (!map[letter] || STATUS_RANK[status] > STATUS_RANK[map[letter]]) map[letter] = status;
      });
    }
    return map;
  }, [guesses, target.word]);

  useEffect(() => {
    if (!done) return;
    let cancelled = false;
    fetchPlayerImage(target.id)
      .then((url) => !cancelled && setImageUrl(url))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [done, target.id]);

  function flashMessage(text: string) {
    setMessage(text);
    setShake(true);
    setTimeout(() => setShake(false), 400);
  }

  function submit() {
    if (done) return;
    if (current.length < WORD_LENGTH) {
      flashMessage('Faltan letras');
      return;
    }
    if (!isValidWord(current)) {
      flashMessage('No es el apellido de un jugador de la lista');
      return;
    }
    if (guesses.includes(current)) {
      flashMessage('Ya probaste esa palabra');
      return;
    }

    const nextGuesses = [...guesses, current];
    const nextWon = current === target.word;
    const nextDone = nextWon || nextGuesses.length >= MAX_GUESSES;

    setGuesses(nextGuesses);
    setCurrent('');
    setMessage(null);
    saveDayRecord(dateKey, { guesses: nextGuesses });
    if (nextDone) setStats(recordFinish(dateKey, nextWon));
  }

  function pressKey(key: string) {
    if (done) return;
    if (key === 'enter') {
      submit();
    } else if (key === 'bksp') {
      setCurrent((c) => c.slice(0, -1));
      setMessage(null);
    } else if (/^[a-z]$/.test(key) && current.length < WORD_LENGTH) {
      setCurrent((c) => c + key.toUpperCase());
      setMessage(null);
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Enter') pressKey('enter');
      else if (e.key === 'Backspace') pressKey('bksp');
      else if (/^[a-zA-Z]$/.test(e.key)) pressKey(e.key.toLowerCase());
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const dateLabel = new Date(`${dateKey}T00:00:00Z`).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });

  return (
    <div style={rootStyle}>
      <button onClick={onBack} style={exitButtonStyle}>
        <BackArrowIcon />
        SALIR
      </button>

      <div style={{ textAlign: 'center' }}>
        <h1 style={titleStyle}>Adivina el jugador</h1>
        <div style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
          Apellido del día · {dateLabel}
        </div>
        <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
          Jugados {stats.played} · Ganados {stats.won} · Racha {stats.streak} · Mejor racha {stats.maxStreak}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateRows: `repeat(${MAX_GUESSES}, 1fr)`,
          gap: 8,
          // Ancho fluido: 312px en escritorio, y se achica si la pantalla es angosta o baja.
          width: 'min(100%, 312px, max(200px, calc((100dvh - 440px) * 0.83)))',
          animation: shake ? 'wordle-shake 0.35s' : undefined,
        }}
      >
        {Array.from({ length: MAX_GUESSES }).map((_, row) => {
          const submitted = guesses[row];
          const isCurrentRow = row === guesses.length && !done;
          const statuses = submitted ? evaluateGuess(submitted, target.word) : null;
          return (
            <div key={row} style={{ display: 'grid', gridTemplateColumns: `repeat(${WORD_LENGTH}, 1fr)`, gap: 8 }}>
              {Array.from({ length: WORD_LENGTH }).map((_, col) => {
                if (statuses) {
                  return (
                    <Tile key={col} letter={submitted[col]} style={TILE_COLORS[statuses[col]]} />
                  );
                }
                if (isCurrentRow) {
                  const letter = current[col];
                  return <Tile key={col} letter={letter} style={letter ? TILE_COLORS.pending : TILE_COLORS.empty} />;
                }
                return <Tile key={col} letter={undefined} style={TILE_COLORS.empty} />;
              })}
            </div>
          );
        })}
      </div>

      <div style={{ height: 22, fontSize: 13, color: colors.danger }}>{!done && message}</div>

      {!done && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', width: '100%', maxWidth: 520 }}>
          {KEYBOARD_ROWS.map((row, i) => (
            <div key={i} style={{ display: 'flex', gap: 'clamp(3px, 1vw, 6px)', width: '100%', justifyContent: 'center' }}>
              {row.map((key) => {
                const status = keyStatus[key];
                const wide = key === 'enter' || key === 'bksp';
                return (
                  <button
                    key={key}
                    onClick={() => pressKey(key)}
                    style={{
                      flex: wide ? 1.5 : 1,
                      minWidth: 0,
                      maxWidth: wide ? 62 : 44,
                      height: 'clamp(42px, 7vh, 52px)',
                      padding: '0 2px',
                      fontFamily: fonts.body,
                      fontSize: wide ? 12 : 17,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      border: 'none',
                      borderRadius: 4,
                      color: '#fff',
                      background: status ? TILE_COLORS[status].background : '#818384',
                      cursor: 'pointer',
                    }}
                  >
                    {key === 'bksp' ? '⌫' : key}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {done && (
        <ResultOverlay
          won={won}
          target={target}
          imageUrl={imageUrl}
          guessesUsed={guesses.length}
          stats={stats}
          onExit={onBack}
        />
      )}

      <style>{`
        @keyframes wordle-shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}

function Tile({ letter, style }: { letter: string | undefined; style: CSSProperties }) {
  return (
    <div
      style={{
        width: '100%',
        aspectRatio: '1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '2px solid',
        fontFamily: fonts.display,
        fontSize: 'clamp(18px, 6vw, 28px)',
        textTransform: 'uppercase',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {letter ?? ''}
    </div>
  );
}

function ResultOverlay({
  won,
  target,
  imageUrl,
  guessesUsed,
  stats,
  onExit,
}: {
  won: boolean;
  target: Target;
  imageUrl: string | null;
  guessesUsed: number;
  stats: Stats;
  onExit: () => void;
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
          padding: '28px clamp(20px, 6vw, 40px)',
          margin: '0 16px',
          background: '#141416',
          border: `2px solid ${won ? colors.accent : colors.danger}`,
          boxShadow: '0 0 40px rgba(47,174,76,0.3)',
          maxWidth: 420,
          textAlign: 'center',
        }}
      >
        <div style={{ fontFamily: fonts.display, fontSize: 34, color: won ? colors.accentLight : colors.danger, textTransform: 'uppercase' }}>
          {won ? '¡Acertaste!' : 'Se acabaron los intentos'}
        </div>
        {imageUrl && (
          <img src={imageUrl} alt="" style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${colors.accent}` }} />
        )}
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{target.name}</div>
        <div style={{ fontSize: 13, color: colors.textMuted }}>
          {won ? `Lo lograste en ${guessesUsed} ${guessesUsed === 1 ? 'intento' : 'intentos'}.` : 'Mañana hay otro jugador.'}
        </div>
        <div style={{ fontSize: 12, color: colors.textMuted }}>
          Racha {stats.streak} · Mejor racha {stats.maxStreak}
        </div>
        <button
          onClick={onExit}
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
          Volver al menú
        </button>
      </div>
    </div>
  );
}

const rootStyle: CSSProperties = {
  position: 'relative',
  zIndex: 2,
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'safe center',
  gap: 16,
  padding: '56px 16px 24px',
  boxSizing: 'border-box',
  overflowY: 'auto',
  background: 'rgba(6,8,12,0.92)',
};

const titleStyle: CSSProperties = {
  fontFamily: fonts.display,
  fontSize: 'clamp(26px, 8vw, 34px)',
  margin: 0,
  color: '#fff',
  textTransform: 'uppercase',
  textShadow: '0 2px 18px rgba(0,0,0,0.6)',
};

const exitButtonStyle: CSSProperties = {
  position: 'absolute',
  top: 20,
  left: 'clamp(16px, 4vw, 40px)',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  background: 'none',
  border: 'none',
  color: colors.textSecondary,
  fontSize: 14,
  fontWeight: 600,
  letterSpacing: 0.5,
  cursor: 'pointer',
  padding: '6px 0',
};
