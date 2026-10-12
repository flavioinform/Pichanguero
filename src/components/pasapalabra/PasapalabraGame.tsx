import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { colors, fonts } from '../../theme';
import {
  isCorrectAnswer,
  nextPendingIndex,
  presentClue,
  type LetterStatus,
  type RoscoEntry,
} from '../../lib/pasapalabra';
import { Rosco } from './Rosco';

interface PasapalabraGameProps {
  entries: RoscoEntry[];
  endsAt: number;
  totalSeconds: number;
  onProgress?: (statuses: LetterStatus[], score: number) => void;
  onFinish: (statuses: LetterStatus[], score: number, timeUp: boolean) => void;
  aside?: ReactNode;
}

interface Feedback {
  kind: 'ok' | 'bad' | 'pass';
  text: string;
}

export function PasapalabraGame({ entries, endsAt, totalSeconds, onProgress, onFinish, aside }: PasapalabraGameProps) {
  const [statuses, setStatuses] = useState<LetterStatus[]>(() => entries.map(() => 'pending'));
  const [current, setCurrent] = useState(0);
  const [input, setInput] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [finished, setFinished] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const statusesRef = useRef(statuses);
  statusesRef.current = statuses;
  const finishedRef = useRef(false);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  const correct = statuses.filter((s) => s === 'correct').length;

  useEffect(() => {
    if (!finished) inputRef.current?.focus();
  }, [current, finished]);

  function endGame(finalStatuses: LetterStatus[], timeUp: boolean) {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setFinished(true);
    const score = finalStatuses.filter((s) => s === 'correct').length;
    onFinishRef.current(finalStatuses, score, timeUp);
  }

  useEffect(() => {
    if (finished) return;
    const interval = setInterval(() => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) {
        clearInterval(interval);
        endGame(statusesRef.current, true);
      }
    }, 250);
    return () => clearInterval(interval);
  }, [endsAt, finished]);

  function submit(e?: FormEvent) {
    e?.preventDefault();
    if (finished || !input.trim()) return;

    const entry = entries[current];
    const isRight = isCorrectAnswer(entry, input);
    const nextStatuses = statuses.map((s, i) =>
      i === current ? (isRight ? 'correct' : 'wrong') : s
    ) as LetterStatus[];

    setStatuses(nextStatuses);
    setInput('');
    setFeedback(isRight ? { kind: 'ok', text: '¡Correcto!' } : { kind: 'bad', text: `Era: ${entry.answer}` });
    onProgressRef.current?.(nextStatuses, nextStatuses.filter((s) => s === 'correct').length);

    const next = nextPendingIndex(nextStatuses, current);
    if (next === null) {
      endGame(nextStatuses, false);
    } else {
      setCurrent(next);
    }
  }

  function pasapalabra() {
    if (finished) return;
    const next = nextPendingIndex(statuses, current);
    if (next !== null) setCurrent(next);
    setInput('');
    setFeedback({ kind: 'pass', text: 'Pasapalabra: la vuelvo a preguntar al final.' });
  }

  const entry = entries[current];
  const timeColor = secondsLeft <= 20 ? colors.danger : colors.accentLight;

  return (
    <div style={{ display: 'flex', gap: 48, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
      <div style={{ width: 'min(420px, 90vw)', flexShrink: 0 }}>
        <Rosco
          letters={entries.map((e) => e.letter)}
          statuses={statuses}
          current={current}
          secondsLeft={secondsLeft}
          totalSeconds={totalSeconds}
          correct={correct}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: 360, maxWidth: '90vw' }}>
        <div style={{ fontFamily: fonts.display, fontSize: 34, color: timeColor, textTransform: 'uppercase' }}>
          Con la {entry.letter}
        </div>
        <div style={{ fontSize: 17, color: '#fff', lineHeight: 1.5, minHeight: 72 }}>{presentClue(entry)}</div>

        <form onSubmit={submit} style={{ display: 'flex', gap: 8 }}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tu respuesta…"
            disabled={finished}
            style={{
              flex: 1,
              padding: '10px 14px',
              fontSize: 15,
              background: colors.surfaceRaised,
              border: `1px solid ${colors.accent}`,
              color: '#fff',
              fontFamily: fonts.body,
              minWidth: 0,
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || finished}
            style={{
              padding: '10px 18px',
              background: colors.accent,
              border: 'none',
              color: '#fff',
              fontWeight: 800,
              textTransform: 'uppercase',
              cursor: input.trim() && !finished ? 'pointer' : 'default',
              opacity: input.trim() && !finished ? 1 : 0.5,
            }}
          >
            Responder
          </button>
        </form>

        <button
          onClick={pasapalabra}
          disabled={finished}
          style={{
            padding: '10px 18px',
            background: 'none',
            border: '1px solid rgba(255,255,255,0.25)',
            color: colors.textSecondary,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            cursor: finished ? 'default' : 'pointer',
          }}
        >
          Pasapalabra
        </button>

        <div
          style={{
            minHeight: 22,
            fontSize: 14,
            color: feedback?.kind === 'ok' ? colors.accentLight : feedback?.kind === 'bad' ? colors.danger : colors.textSecondary,
          }}
        >
          {feedback?.text}
        </div>

        {aside}
      </div>
    </div>
  );
}
