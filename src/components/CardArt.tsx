import { useId } from 'react';
import { fonts } from '../theme';
import type { IconKey } from '../types';

/** Original line-art illustration per game, filling the whole card — same
 * visual language as the line icons (green strokes, hand-drawn) but used as
 * the card's background instead of a stock photo. Drawn on a fixed 200×320
 * canvas and scaled to cover whichever card size it's placed in. */
const GLOW: Record<IconKey, { cx: string; cy: string; r: string; stop: string }> = {
  grid: { cx: '50%', cy: '42%', r: '55%', stop: '#173a20' },
  dice: { cx: '50%', cy: '45%', r: '55%', stop: '#173a20' },
  help: { cx: '50%', cy: '38%', r: '45%', stop: '#1d1d1f' },
};

export function CardArt({ iconKey }: { iconKey: IconKey }) {
  const uid = useId();
  const glowId = `cardart-glow-${uid}`;
  const fadeId = `cardart-fade-${uid}`;
  const glow = GLOW[iconKey];

  return (
    <svg
      viewBox="0 0 200 320"
      preserveAspectRatio="xMidYMid slice"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
    >
      <defs>
        <radialGradient id={glowId} cx={glow.cx} cy={glow.cy} r={glow.r}>
          <stop offset="0%" stopColor={glow.stop} />
          <stop offset="100%" stopColor="#0a0a0c" />
        </radialGradient>
        <linearGradient id={fadeId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a0a0c" stopOpacity={0} />
          <stop offset="68%" stopColor="#0a0a0c" stopOpacity={0} />
          <stop offset="100%" stopColor="#0a0a0c" stopOpacity={0.92} />
        </linearGradient>
      </defs>
      <rect width={200} height={320} fill={`url(#${glowId})`} />
      {iconKey === 'grid' && <GatoArt />}
      {iconKey === 'dice' && <TuttiArt />}
      {iconKey === 'help' && <AdivinaArt />}
      <rect width={200} height={320} fill={`url(#${fadeId})`} />
    </svg>
  );
}

function GatoArt() {
  return (
    <>
      <g stroke="#2fae4c" strokeWidth={2.6} opacity={0.9}>
        <rect x={42} y={60} width={116} height={166} fill="none" />
        <line x1={80} y1={60} x2={80} y2={226} />
        <line x1={120} y1={60} x2={120} y2={226} />
        <line x1={42} y1={115} x2={158} y2={115} />
        <line x1={42} y1={170} x2={158} y2={170} />
      </g>
      <g transform="translate(100,142)">
        <circle r={22} fill="#0a0a0c" stroke="#4cd964" strokeWidth={2} />
        <path d="M0 -11l7.3 5.3-2.8 8.6H-4.5l-2.8-8.6z" fill="#4cd964" />
      </g>
      <path d="M56 152l8 10 20-24" stroke="#4cd964" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.85} />
      <g stroke="#8a8a8e" strokeWidth={2.6} strokeLinecap="round" opacity={0.5}>
        <line x1={133} y1={182} x2={149} y2={200} />
        <line x1={149} y1={182} x2={133} y2={200} />
      </g>
    </>
  );
}

function TuttiArt() {
  return (
    <>
      <g transform="translate(72,128) rotate(-12)">
        <rect x={-38} y={-38} width={76} height={76} rx={9} fill="#0a0a0c" stroke="#2fae4c" strokeWidth={2.6} />
        <g fill="#4cd964">
          <circle cx={-19} cy={-19} r={4} />
          <circle cx={19} cy={-19} r={4} />
          <circle cx={-19} cy={19} r={4} />
          <circle cx={19} cy={19} r={4} />
          <circle cx={0} cy={0} r={4} />
        </g>
      </g>
      <g transform="translate(128,200) rotate(10)">
        <rect x={-35} y={-35} width={70} height={70} rx={9} fill="#0a0a0c" stroke="#4cd964" strokeWidth={2.6} />
        <text x={0} y={15} textAnchor="middle" fontFamily={fonts.display} fontSize={44} fill="#4cd964">
          F
        </text>
      </g>
    </>
  );
}

function AdivinaArt() {
  return (
    <>
      <g fill="#16211a" stroke="#2fae4c" strokeWidth={2.2}>
        <circle cx={100} cy={112} r={28} />
        <path d="M52 218c0-38 23-61 48-61s48 23 48 61v17H52z" />
      </g>
      <g stroke="#2fae4c" strokeWidth={1.6} opacity={0.5}>
        <line x1={76} y1={195} x2={124} y2={195} />
        <line x1={80} y1={207} x2={120} y2={207} />
      </g>
      <text x={100} y={140} textAnchor="middle" fontFamily={fonts.display} fontSize={72} fill="#4cd964">
        ?
      </text>
    </>
  );
}
