import { fonts, colors } from '../../theme';
import type { LetterStatus } from '../../lib/pasapalabra';

const SIZE = 400;
const CENTER = SIZE / 2;
const RING_RADIUS = 152;
const NODE_RADIUS = 22;
const TIMER_RADIUS = 104;
const TIMER_CIRCUMFERENCE = 2 * Math.PI * TIMER_RADIUS;

function nodePosition(index: number, count: number) {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
  return { x: CENTER + RING_RADIUS * Math.cos(angle), y: CENTER + RING_RADIUS * Math.sin(angle) };
}

interface RoscoProps {
  letters: string[];
  statuses: LetterStatus[];
  current: number;
  secondsLeft: number;
  totalSeconds: number;
  correct: number;
}

export function Rosco({ letters, statuses, current, secondsLeft, totalSeconds, correct }: RoscoProps) {
  const fraction = totalSeconds > 0 ? Math.max(0, secondsLeft / totalSeconds) : 0;
  const timerColor = secondsLeft <= 20 ? colors.danger : '#2fae4c';
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = String(secondsLeft % 60).padStart(2, '0');

  return (
    <svg width="100%" viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ maxWidth: SIZE, display: 'block' }}>
      <defs>
        <radialGradient id="rosco-bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0f2014" />
          <stop offset="70%" stopColor="#08100b" />
          <stop offset="100%" stopColor="#050706" />
        </radialGradient>
        <radialGradient id="rosco-pending" cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#2a2f2b" />
          <stop offset="100%" stopColor="#101312" />
        </radialGradient>
        <radialGradient id="rosco-correct" cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#58d978" />
          <stop offset="100%" stopColor="#1f7a37" />
        </radialGradient>
        <radialGradient id="rosco-wrong" cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#f08a8a" />
          <stop offset="100%" stopColor="#8f2a2a" />
        </radialGradient>
        <filter id="rosco-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle cx={CENTER} cy={CENTER} r={CENTER - 2} fill="url(#rosco-bg)" stroke="rgba(47,174,76,0.35)" strokeWidth={1.5} />
      <circle cx={CENTER} cy={CENTER} r={RING_RADIUS} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={28} />

      <circle cx={CENTER} cy={CENTER} r={TIMER_RADIUS} fill="rgba(0,0,0,0.45)" stroke="rgba(255,255,255,0.1)" strokeWidth={8} />
      <circle
        cx={CENTER}
        cy={CENTER}
        r={TIMER_RADIUS}
        fill="none"
        stroke={timerColor}
        strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={TIMER_CIRCUMFERENCE}
        strokeDashoffset={TIMER_CIRCUMFERENCE * (1 - fraction)}
        transform={`rotate(-90 ${CENTER} ${CENTER})`}
        style={{ transition: 'stroke-dashoffset 0.25s linear, stroke 0.3s' }}
      />

      <text x={CENTER} y={CENTER + 4} textAnchor="middle" fontFamily={fonts.display} fontSize={50} fill="#fff">
        {minutes}:{seconds}
      </text>
      <text x={CENTER} y={CENTER + 34} textAnchor="middle" fontSize={14} fill="rgba(255,255,255,0.6)" letterSpacing={2}>
        {correct} / {letters.length}
      </text>

      {letters.map((letter, i) => {
        const { x, y } = nodePosition(i, letters.length);
        const status = statuses[i];
        const isCurrent = i === current;
        const fill =
          status === 'correct' ? 'url(#rosco-correct)' : status === 'wrong' ? 'url(#rosco-wrong)' : 'url(#rosco-pending)';
        return (
          <g key={letter} filter={isCurrent ? 'url(#rosco-glow)' : undefined}>
            <circle
              cx={x}
              cy={y}
              r={isCurrent ? NODE_RADIUS + 3 : NODE_RADIUS}
              fill={fill}
              stroke={isCurrent ? '#f2d16b' : status === 'pending' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)'}
              strokeWidth={isCurrent ? 3 : 1.5}
            />
            <text
              x={x}
              y={y + 7}
              textAnchor="middle"
              fontFamily={fonts.display}
              fontSize={isCurrent ? 22 : 19}
              fill={status === 'pending' ? '#f1f1f1' : '#fff'}
            >
              {letter}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
