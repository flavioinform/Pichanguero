import { colors } from '../../theme';

/** Two linked players — used for the "Jugar online" mode card. */
export function OnlineIcon() {
  return (
    <svg width={72} height={72} viewBox="0 0 24 24" fill="none" stroke={colors.accentLight} strokeWidth={1.3}>
      <circle cx="8" cy="8" r="3" />
      <path d="M3 19c0-3 2.2-5 5-5s5 2 5 5" />
      <circle cx="17" cy="9" r="2.3" />
      <path d="M14.5 19c0-2.6 1.6-4.3 4-4.3" />
      <path d="M11.5 11.5l2.5-1.2" strokeDasharray="1.6 1.6" />
    </svg>
  );
}

/** A CPU chip — used for the "Jugar offline / vs CPU" mode card. */
export function CpuIcon() {
  return (
    <svg width={72} height={72} viewBox="0 0 24 24" fill="none" stroke={colors.accentLight} strokeWidth={1.3}>
      <rect x="6" y="6" width="12" height="12" rx="1.2" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="0.6" />
      <path d="M9 3v2.3M12 3v2.3M15 3v2.3M9 18.7V21M12 18.7V21M15 18.7V21" />
      <path d="M3 9h2.3M3 12h2.3M3 15h2.3M18.7 9H21M18.7 12H21M18.7 15H21" />
    </svg>
  );
}

function Star({ filled }: { filled: boolean }) {
  return (
    <svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2.5l2.6 5.6 6 0.7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6-4.5-4.1 6-0.7z"
        fill={filled ? colors.accentLight : 'none'}
        stroke={filled ? colors.accentLight : 'rgba(255,255,255,0.3)'}
        strokeWidth={1.2}
      />
    </svg>
  );
}

/** `filled` stars out of 3 — used for the easy/medium/hard difficulty cards. */
export function DifficultyIcon({ filled }: { filled: 1 | 2 | 3 }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[0, 1, 2].map((i) => (
        <Star key={i} filled={i < filled} />
      ))}
    </div>
  );
}
