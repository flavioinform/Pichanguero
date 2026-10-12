/** No licensed trophy photos available (real trophy shapes are typically
 * trademarked by their competition), so this is a stylized generic cup
 * rather than a photo of any specific real trophy — colored/shaped per tier
 * so a league title, domestic cup and continental title still read as
 * visually distinct. */
export function TrophyIcon({ tier = 'league', size = 20 }: { tier?: 'league' | 'cup' | 'continental'; size?: number }) {
  const colorsByTier = {
    league: { cup: '#ffd24c', handle: '#c9960f', base: '#8a6a0a' },
    cup: { cup: '#d8d8dc', handle: '#9a9aa0', base: '#6a6a70' },
    continental: { cup: '#9fc7ff', handle: '#4c7fd9', base: '#2a4f99' },
  }[tier];

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M7 3h10v4a5 5 0 0 1-10 0V3z"
        fill={colorsByTier.cup}
        stroke={colorsByTier.handle}
        strokeWidth={1}
        strokeLinejoin="round"
      />
      <path d="M7 4H4.5A1.5 1.5 0 0 0 3 5.5 3.5 3.5 0 0 0 6.5 9" stroke={colorsByTier.handle} strokeWidth={1.3} fill="none" />
      <path d="M17 4h2.5A1.5 1.5 0 0 1 21 5.5 3.5 3.5 0 0 1 17.5 9" stroke={colorsByTier.handle} strokeWidth={1.3} fill="none" />
      <line x1="12" y1="12" x2="12" y2="16" stroke={colorsByTier.handle} strokeWidth={1.3} />
      <path d="M8.5 20h7" stroke={colorsByTier.base} strokeWidth={1.3} strokeLinecap="round" />
      <path
        d="M9.5 20c0-2 1-3 2.5-3.5 1.5 0.5 2.5 1.5 2.5 3.5"
        fill={colorsByTier.base}
        stroke={colorsByTier.base}
        strokeWidth={1}
      />
    </svg>
  );
}
