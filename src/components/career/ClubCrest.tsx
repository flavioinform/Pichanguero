import { useId, useState } from 'react';
import { fonts } from '../../theme';
import { getClubCrestUrl } from '../../lib/clubCrest';

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const PALETTE: { a: string; b: string }[] = [
  { a: '#1c3f8a', b: '#0a1f45' },
  { a: '#a5201f', b: '#4a0c0c' },
  { a: '#1c6b3a', b: '#0a3019' },
  { a: '#8a6a1c', b: '#3a2a0a' },
  { a: '#5a1c8a', b: '#2a0a45' },
  { a: '#1c7f8a', b: '#0a3540' },
  { a: '#8a3c1c', b: '#3a1a0a' },
];

function initials(clubName: string): string {
  const words = clubName.replace(/[^\p{L}\s]/gu, '').split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words
    .slice(0, 3)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

/** Deterministic shield used when no real crest image is available (unknown
 * club id, or the Transfermarkt CDN doesn't have that club's badge) — same
 * club always gets the same colors/initials instead of a generic circle. */
function GeneratedCrest({ name, size }: { name: string; size: number }) {
  const uid = useId();
  const gradId = `crest-${uid}`;
  const { a, b } = PALETTE[hashString(name) % PALETTE.length];

  return (
    <svg width={size} height={size * 1.12} viewBox="0 0 44 50">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={a} />
          <stop offset="100%" stopColor={b} />
        </linearGradient>
      </defs>
      <path
        d="M22 1 L41 7 V24 C41 37 33 45 22 49 C11 45 3 37 3 24 V7 Z"
        fill={`url(#${gradId})`}
        stroke="rgba(255,255,255,0.3)"
        strokeWidth={1}
      />
      <text x="22" y="29" textAnchor="middle" fontFamily={fonts.display} fontSize={size <= 32 ? 11 : 14} fill="#fff">
        {initials(name)}
      </text>
    </svg>
  );
}

/** `clubs.id` in our DB is the original Transfermarkt club_id from the
 * imported dataset, which lines up with Transfermarkt's own crest CDN. Most
 * clubs resolve to a real badge; anything that 404s (lower-tier/obscure
 * clubs not in their image set) falls back to the generated shield. */
export function ClubCrest({ clubId, name, size = 44 }: { clubId?: number | null; name: string; size?: number }) {
  const [failed, setFailed] = useState(false);

  if (!clubId || failed) {
    return <GeneratedCrest name={name} size={size} />;
  }

  return (
    <img
      src={getClubCrestUrl(clubId)}
      alt=""
      width={size}
      height={size}
      onError={() => setFailed(true)}
      style={{ width: size, height: size, objectFit: 'contain', display: 'block', flexShrink: 0 }}
    />
  );
}
