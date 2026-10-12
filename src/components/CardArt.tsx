import { useId } from 'react';
import type { ComponentType } from 'react';
import { fonts, colors } from '../theme';
import { usePlayerPhotos } from '../hooks/usePlayerPhotos';
import type { IconKey } from '../types';

const PHOTO_GAMES = new Set<IconKey>(['career', 'headsoccer']);

/** Imagen de portada por juego. Si el juego está acá, la tarjeta muestra la imagen en vez del dibujo. */
const CARD_IMAGES: Partial<Record<IconKey, string>> = {
  career: '/portada.jpg',
  headsoccer: '/card-headsoccer.jpg',
  grid: '/card-gato.jpg',
  dice: '/card-tutti.jpg',
  help: '/card-adivina.jpg',
  auction: '/card-subasta.jpg',
};

const PHOTO_SLOTS = [
  { x: 14, y: 34, size: 84 },
  { x: 102, y: 34, size: 84 },
  { x: 58, y: 196, size: 84 },
];

/** Original line-art illustration per game, filling the whole card — same
 * visual language as the line icons (green strokes, hand-drawn) but used as
 * the card's background instead of a stock photo. Drawn on a fixed 200×320
 * canvas and scaled to cover whichever card size it's placed in. */
const GLOW: Record<IconKey, { cx: string; cy: string; r: string; stop: string }> = {
  grid: { cx: '50%', cy: '42%', r: '55%', stop: '#173a20' },
  dice: { cx: '50%', cy: '45%', r: '55%', stop: '#173a20' },
  help: { cx: '50%', cy: '38%', r: '45%', stop: '#1d1d1f' },
  rosco: { cx: '50%', cy: '42%', r: '55%', stop: '#173a20' },
  career: { cx: '50%', cy: '40%', r: '55%', stop: '#1d2a3a' },
  headsoccer: { cx: '50%', cy: '40%', r: '55%', stop: '#173a20' },
  auction: { cx: '50%', cy: '40%', r: '55%', stop: '#3a2f17' },
};

export function CardArt({ iconKey }: { iconKey: IconKey }) {
  const uid = useId();
  const glowId = `cardart-glow-${uid}`;
  const fadeId = `cardart-fade-${uid}`;
  const glow = GLOW[iconKey];
  const photos = usePlayerPhotos(PHOTO_GAMES.has(iconKey), PHOTO_SLOTS.length);

  const cardImage = CARD_IMAGES[iconKey];
  if (cardImage) {
    return (
      <img
        src={cardImage}
        alt=""
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 200 320"
      preserveAspectRatio="xMidYMid slice"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
    >
      <defs>
        <radialGradient id={glowId} cx={glow.cx} cy={glow.cy} r={glow.r}>
          <stop offset="0%" stopColor={glow.stop} />
          <stop offset="100%" stopColor={colors.bg} />
        </radialGradient>
        <linearGradient id={fadeId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colors.bg} stopOpacity={0} />
          <stop offset="68%" stopColor={colors.bg} stopOpacity={0} />
          <stop offset="100%" stopColor={colors.bg} stopOpacity={0.92} />
        </linearGradient>
      </defs>
      <rect width={200} height={320} fill={`url(#${glowId})`} />
      {photos.length > 0 ? <PhotoCollage urls={photos} idPrefix={uid} /> : <LineArt iconKey={iconKey} />}
      <rect width={200} height={320} fill={`url(#${fadeId})`} />
    </svg>
  );
}

/** One hand-drawn illustration per game; typed as a full Record so a new
 * icon key can't ship without its card art. */
const LINE_ART: Record<IconKey, ComponentType> = {
  grid: GatoArt,
  dice: TuttiArt,
  help: AdivinaArt,
  rosco: RoscoArt,
  career: CareerArt,
  headsoccer: HeadSoccerArt,
  auction: AuctionArt,
};

function LineArt({ iconKey }: { iconKey: IconKey }) {
  const Art = LINE_ART[iconKey];
  return <Art />;
}

function AuctionArt() {
  return (
    <>
      <g fill="#16150f" stroke="#e0b94a" strokeWidth={2.2}>
        <circle cx={100} cy={104} r={26} />
        <path d="M54 206c0-36 21-58 46-58s46 22 46 58v14H54z" />
      </g>
      <text x={100} y={128} textAnchor="middle" fontFamily={fonts.display} fontSize={62} fill="#e0b94a" opacity={0.9}>
        ?
      </text>
      <g transform="translate(138,230) rotate(-30)" stroke="#4cd964" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill={colors.bg}>
        <rect x={-22} y={-9} width={44} height={18} rx={3} />
        <line x1={0} y1={9} x2={0} y2={40} />
      </g>
      <text x={64} y={272} textAnchor="middle" fontFamily={fonts.display} fontSize={22} fill="#4cd964">
        50M
      </text>
    </>
  );
}

function PhotoCollage({ urls, idPrefix }: { urls: string[]; idPrefix: string }) {
  return (
    <>
      {urls.map((url, i) => {
        const slot = PHOTO_SLOTS[i];
        const clipId = `${idPrefix}-photo-${i}`;
        const cx = slot.x + slot.size / 2;
        const cy = slot.y + slot.size / 2;
        return (
          <g key={clipId}>
            <defs>
              <clipPath id={clipId}>
                <circle cx={cx} cy={cy} r={slot.size / 2} />
              </clipPath>
            </defs>
            <image
              href={url}
              x={slot.x}
              y={slot.y}
              width={slot.size}
              height={slot.size}
              preserveAspectRatio="xMidYMid slice"
              clipPath={`url(#${clipId})`}
            />
            <circle cx={cx} cy={cy} r={slot.size / 2} fill="none" stroke="#4cd964" strokeWidth={2.5} />
          </g>
        );
      })}
    </>
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
        <rect x={-38} y={-38} width={76} height={76} rx={9} fill={colors.bg} stroke="#2fae4c" strokeWidth={2.6} />
        <g fill="#4cd964">
          <circle cx={-19} cy={-19} r={4} />
          <circle cx={19} cy={-19} r={4} />
          <circle cx={-19} cy={19} r={4} />
          <circle cx={19} cy={19} r={4} />
          <circle cx={0} cy={0} r={4} />
        </g>
      </g>
      <g transform="translate(128,200) rotate(10)">
        <rect x={-35} y={-35} width={70} height={70} rx={9} fill={colors.bg} stroke="#4cd964" strokeWidth={2.6} />
        <text x={0} y={15} textAnchor="middle" fontFamily={fonts.display} fontSize={44} fill="#4cd964">
          F
        </text>
      </g>
    </>
  );
}

function RoscoArt() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').slice(0, 12);
  return (
    <>
      {letters.map((letter, i) => {
        const angle = (-Math.PI / 2) + (i * 2 * Math.PI) / letters.length;
        const x = 100 + 78 * Math.cos(angle);
        const y = 160 + 78 * Math.sin(angle);
        return (
          <g key={letter}>
            <circle cx={x} cy={y} r={14} fill={colors.bg} stroke={i % 3 === 0 ? '#4cd964' : '#2fae4c'} strokeWidth={2} />
            <text x={x} y={y + 6} textAnchor="middle" fontFamily={fonts.display} fontSize={15} fill="#4cd964">
              {letter}
            </text>
          </g>
        );
      })}
    </>
  );
}

function CareerArt() {
  return (
    <>
      <g stroke="#4a7fd1" strokeWidth={2} opacity={0.6}>
        <rect x={36} y={56} width={128} height={176} rx={4} fill="none" />
        <circle cx={100} cy={144} r={30} fill="none" />
        <line x1={100} y1={56} x2={100} y2={232} />
      </g>
      <path
        d="M52 210 C70 180 65 150 90 130 S140 100 150 70"
        stroke="#4cd964"
        strokeWidth={3}
        strokeLinecap="round"
        fill="none"
        strokeDasharray="1 10"
        opacity={0.9}
      />
      <g transform="translate(150,70)">
        <circle r={9} fill="#4cd964" />
        <path d="M-3.5 -3.6l2.4 1.7-0.9 2.8h-3l-0.9-2.8z" fill={colors.bg} transform="scale(1.3)" />
      </g>
      <g transform="translate(52,210)">
        <circle r={7} fill={colors.bg} stroke="#2fae4c" strokeWidth={2} />
      </g>
      <text x={100} y={272} textAnchor="middle" fontFamily={fonts.display} fontSize={22} fill="#4cd964">
        CARRERA
      </text>
    </>
  );
}

function HeadSoccerArt() {
  return (
    <>
      <g stroke="#2fae4c" strokeWidth={2} opacity={0.6}>
        <line x1={20} y1={210} x2={180} y2={210} />
        <line x1={100} y1={60} x2={100} y2={210} />
        <circle cx={100} cy={140} r={36} fill="none" />
      </g>
      <g transform="translate(66,116)">
        <circle r={17} fill="#e0a878" stroke="#4cd964" strokeWidth={3} />
        <rect x={-13} y={14} width={26} height={30} rx={7} fill="#4cd964" />
      </g>
      <g transform="translate(134,150)">
        <circle r={17} fill="#e0a878" stroke="#2fae4c" strokeWidth={3} />
        <rect x={-13} y={14} width={26} height={30} rx={7} fill="#2fae4c" />
      </g>
      <circle cx={100} cy={96} r={10} fill="#f5f5f5" stroke="#3a3a3a" strokeWidth={1.4} />
      <text x={100} y={252} textAnchor="middle" fontFamily={fonts.display} fontSize={20} fill="#4cd964">
        HEAD SOCCER
      </text>
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
