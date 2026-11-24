import type { CSSProperties, ReactNode } from 'react';
import type { PlayerCustom, StreetTeam } from '../../../lib/street/team';
import { menuSound } from './menuSound';

/** Fichas para elegir una opción de una lista (peinado, tipo de camiseta...). */
export function Chips<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  label?: string;
}) {
  return (
    <div role="group" aria-label={label} className="pm-chips">
      {options.map((o) => (
        <button
          key={String(o.id)}
          type="button"
          className="pm-chip"
          aria-pressed={o.id === value}
          onClick={() => {
            menuSound('select');
            onChange(o.id);
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Paleta de colores: cuadraditos para elegir, y un selector libre al final si se quiere cualquier color. */
export function Swatches({
  colors,
  value,
  onChange,
  label,
  custom = true,
  allowNone,
}: {
  colors: readonly string[];
  value: string | null;
  onChange: (color: string | null) => void;
  label: string;
  custom?: boolean;
  /** muestra un cuadro "ninguno" (por ejemplo: usar el color del equipo) */
  allowNone?: string;
}) {
  const known = value !== null && colors.some((c) => c.toLowerCase() === value.toLowerCase());
  return (
    <div role="group" aria-label={label} className="pm-swatches">
      {allowNone && (
        <button type="button" className="pm-chip" aria-pressed={value === null} onClick={() => onChange(null)}>
          {allowNone}
        </button>
      )}
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          className="pm-swatch"
          aria-label={`${label} ${c}`}
          aria-pressed={value !== null && c.toLowerCase() === value.toLowerCase()}
          style={{ background: c }}
          onClick={() => {
            menuSound('select');
            onChange(c);
          }}
        />
      ))}
      {custom && (
        <label className="pm-swatch" aria-label={`${label}: otro color`} aria-pressed={value !== null && !known} style={{ position: 'relative', background: value && !known ? value : 'conic-gradient(#e63946, #ffb347, #7cd957, #35a7ff, #d14fc2, #e63946)', display: 'block' }}>
          <input
            type="color"
            value={value ?? '#ffffff'}
            onChange={(e) => onChange(e.target.value)}
            style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
          />
        </label>
      )}
    </div>
  );
}

/** Interruptor con nombre: "Sonido  [Sí]". */
export function Switch({
  label,
  hint,
  checked,
  onChange,
  onText = 'Sí',
  offText = 'No',
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  onText?: string;
  offText?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className="pm-switch"
      onClick={() => {
        menuSound('select');
        onChange(!checked);
      }}
    >
      <span>
        <span style={{ display: 'block', fontWeight: 800 }}>{label}</span>
        {hint && <span className="pm-small pm-dim">{hint}</span>}
      </span>
      <b>{checked ? onText : offText}</b>
    </button>
  );
}

/** Un panel con las esquinas cortadas. */
export function Panel({ children, flat, style, className = '' }: { children: ReactNode; flat?: boolean; style?: CSSProperties; className?: string }) {
  return (
    <section className={`pm-panel ${flat ? 'flat' : ''} ${className}`} style={style}>
      {children}
    </section>
  );
}

/** Un avatar chico y plano (SVG) del jugador: piel, peinado, camiseta. Sirve para las tarjetas y como alternativa si no hay 3D. */
export function MiniAvatar({ player, team, size = 48 }: { player: PlayerCustom; team: StreetTeam; size?: number }) {
  const jersey = player.shirtColor ?? team.primary;
  const hair = player.hairColor;
  return (
    <svg width={size} height={(size * 56) / 48} viewBox="0 0 48 56" role="presentation" style={{ display: 'block', flexShrink: 0 }}>
      {player.hairStyle === 'afro' && <circle cx={24} cy={17} r={15} fill={hair} />}
      {player.hairStyle === 'rodete' && <circle cx={24} cy={4} r={5} fill={hair} />}
      {player.hairStyle === 'cresta' && <path d="M21 5 L24 -1 L27 5 Z M20 8 H28 V13 H20 Z" fill={hair} />}
      <path d="M6 56 V44 C6 36 13 33 24 33 C35 33 42 36 42 44 V56 Z" fill={jersey} stroke="#0b0d11" strokeWidth={2} />
      <circle cx={24} cy={20} r={11} fill={player.skin} stroke="#0b0d11" strokeWidth={2} />
      {(player.hairStyle === 'corto' || player.hairStyle === 'cinta' || player.hairStyle === 'rodete' || player.hairStyle === 'trenzas') && <path d="M13 19 C13 8 35 8 35 19 C31 14 17 14 13 19 Z" fill={hair} />}
      {player.hairStyle === 'trenzas' && <path d="M14 19 V30 M19 17 V28 M29 17 V28 M34 19 V30" stroke={hair} strokeWidth={2.4} strokeLinecap="round" />}
      {player.hairStyle === 'gorro' && <path d="M12 18 C12 5 36 5 36 18 Z" fill={team.secondary} stroke="#0b0d11" strokeWidth={1.5} />}
      {player.hairStyle === 'cinta' && <rect x={12} y={14} width={24} height={4} fill={team.secondary} />}
      {player.beard && <path d="M15 24 C17 33 31 33 33 24 C29 28 19 28 15 24 Z" fill={hair} />}
      <circle cx={20} cy={20} r={1.4} fill="#15171c" />
      <circle cx={28} cy={20} r={1.4} fill="#15171c" />
    </svg>
  );
}
