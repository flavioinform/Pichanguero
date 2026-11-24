import { useEffect, useState } from 'react';
import {
  BUILDS,
  CELEBRATIONS,
  ENTRY_GESTURES,
  HAIR_COLORS,
  HAIR_STYLES,
  HEIGHTS,
  NICKNAME_MAX,
  PLAYER_ROLES,
  SHIRT_TYPES,
  SHOE_COLORS,
  SHORTS_LENGTHS,
  SKIN_TONES,
  SOCK_TYPES,
  STAT_HINTS,
  STAT_KEYS,
  STAT_LABELS,
  STAT_MAX,
  STAT_MIN,
  STAT_POINTS,
  TEAM_COLORS,
  changeStat,
  freePoints,
  numberProblem,
  takenNumbers,
  type PlayerCustom,
  type StreetTeam,
} from '../../../lib/street/team';
import { menuSound } from './menuSound';
import { Chips, MiniAvatar, Panel, Swatches } from './ui';
import { TeamPreview3d } from './TeamPreview3d';
import type { PreviewAction } from '../previewScene';

interface TeamScreenProps {
  team: StreetTeam;
  onChange: (update: (team: StreetTeam) => StreetTeam) => void;
  onBack: () => void;
  onIdentity: () => void;
  onConfirm: () => void;
  onRandom: () => void;
  onReset: () => void;
}

const TABS = [
  { id: 'look', label: 'Apariencia' },
  { id: 'clothes', label: 'Ropa' },
  { id: 'style', label: 'Estilo' },
  { id: 'stats', label: 'Estadísticas' },
] as const;
type Tab = (typeof TABS)[number]['id'];

/** Número de camiseta: se escribe y solo se aplica si es válido (1 a 99 y sin repetir). */
function NumberField({ team, slot, onApply }: { team: StreetTeam; slot: number; onApply: (n: number) => void }) {
  const current = team.players[slot].number;
  const [draft, setDraft] = useState(String(current));
  const problem = numberProblem(team, slot, Number(draft));

  const apply = (text: string) => {
    setDraft(text);
    const n = Number(text);
    if (text !== '' && !numberProblem(team, slot, n)) onApply(n);
  };
  /** el siguiente número libre en esa dirección */
  const step = (dir: 1 | -1) => {
    const taken = takenNumbers(team, slot);
    let n = current;
    for (let i = 0; i < 99; i++) {
      n = ((n - 1 + dir + 99) % 99) + 1;
      if (!taken.has(n)) break;
    }
    menuSound('select');
    setDraft(String(n));
    onApply(n);
  };

  return (
    <div>
      <label className="pm-label" htmlFor="pm-number">
        Número
      </label>
      <div style={{ display: 'flex', gap: 6 }}>
        <button type="button" className="pm-step" aria-label="Número anterior" onClick={() => step(-1)}>
          −
        </button>
        <input
          id="pm-number"
          className="pm-input"
          inputMode="numeric"
          value={draft}
          aria-invalid={!!problem}
          aria-describedby={problem ? 'pm-number-problem' : undefined}
          onChange={(e) => apply(e.target.value.replace(/\D/g, '').slice(0, 2))}
          onBlur={() => setDraft(String(current))}
          style={{ width: 64, textAlign: 'center', fontFamily: "'Anton', Impact, sans-serif", fontSize: 22, padding: '4px 6px' }}
        />
        <button type="button" className="pm-step" aria-label="Número siguiente" onClick={() => step(1)}>
          +
        </button>
      </div>
      {problem && (
        <p id="pm-number-problem" role="alert" className="pm-error">
          {problem}
        </p>
      )}
    </div>
  );
}

export function TeamScreen({ team, onChange, onBack, onIdentity, onConfirm, onRandom, onReset }: TeamScreenProps) {
  const [slot, setSlot] = useState(1);
  const [tab, setTab] = useState<Tab>('look');
  const [action, setAction] = useState<{ kind: PreviewAction; nonce: number } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const player = team.players[slot];

  useEffect(() => {
    if (!confirmReset) return;
    const t = setTimeout(() => setConfirmReset(false), 2800);
    return () => clearTimeout(t);
  }, [confirmReset]);

  /** cambia datos del jugador elegido */
  const edit = (patch: Partial<PlayerCustom>) =>
    onChange((t) => ({ ...t, players: t.players.map((p, i) => (i === slot ? { ...p, ...patch } : p)) as StreetTeam['players'] }));
  const play = (kind: PreviewAction) => setAction((a) => ({ kind, nonce: (a?.nonce ?? 0) + 1 }));

  return (
    <div className="pm-screen">
      <header className="pm-head">
        <h1 className="pm-title pm-h2">Mi equipo</h1>
        <p className="pm-small pm-dim" style={{ margin: 0, textAlign: 'right' }}>
          {team.name} · {team.abbr}
        </p>
      </header>

      <div className="pm-team-grid pm-stagger">
        {/* izquierda: los tres jugadores */}
        <div className="pm-list" role="listbox" aria-label="Jugadores del equipo">
          {team.players.map((p, i) => (
            <button
              key={i}
              type="button"
              role="option"
              aria-selected={i === slot}
              className="pm-card"
              onClick={() => {
                menuSound('select');
                setSlot(i);
              }}
            >
              <span className="pm-card-number" style={{ color: i === slot ? 'var(--team)' : undefined }}>
                {p.number}
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                <b style={{ fontSize: 17, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nickname}</b>
                <span className="pm-small pm-dim">{PLAYER_ROLES[i]}</span>
              </span>
              <MiniAvatar player={p} team={team} size={40} />
            </button>
          ))}
          <button type="button" className="pm-btn ghost small" onClick={onIdentity} style={{ alignSelf: 'start', marginTop: 6 }}>
            Identidad del equipo
          </button>
        </div>

        {/* centro: vista previa 3D */}
        <div className="pm-stage">
          <TeamPreview3d team={team} slot={slot} action={action} />
          <p className="pm-stage-hint pm-small pm-dim">Arrastrá para girarlo</p>
        </div>

        {/* derecha: opciones */}
        <Panel className="pm-options">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 14, alignItems: 'start' }}>
            <div>
              <label className="pm-label" htmlFor="pm-nick">
                Apodo
              </label>
              <input
                id="pm-nick"
                className="pm-input"
                maxLength={NICKNAME_MAX}
                value={player.nickname}
                onChange={(e) => edit({ nickname: e.target.value })}
                onBlur={() => !player.nickname.trim() && edit({ nickname: `Jugador ${slot + 1}` })}
              />
            </div>
            <NumberField key={slot} team={team} slot={slot} onApply={(n) => edit({ number: n })} />
          </div>

          <div role="tablist" aria-label="Opciones del jugador" className="pm-tabs" style={{ marginTop: 16 }}>
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`pm-tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls="pm-tabpanel"
                className="pm-tab"
                onClick={() => {
                  menuSound('select');
                  setTab(t.id);
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div role="tabpanel" id="pm-tabpanel" aria-labelledby={`pm-tab-${tab}`}>
            {tab === 'look' && (
              <>
                <span className="pm-label">Tono de piel</span>
                <Swatches colors={SKIN_TONES} value={player.skin} label="Tono de piel" custom={false} onChange={(c) => c && edit({ skin: c })} />
                <span className="pm-label">Peinado</span>
                <Chips options={HAIR_STYLES} value={player.hairStyle} label="Peinado" onChange={(hairStyle) => edit({ hairStyle })} />
                <span className="pm-label">Color de pelo</span>
                <Swatches colors={HAIR_COLORS} value={player.hairColor} label="Color de pelo" custom={false} onChange={(c) => c && edit({ hairColor: c })} />
                <span className="pm-label">Barba</span>
                <Chips
                  options={[{ id: 'no', label: 'Sin barba' }, { id: 'si', label: 'Con barba' }] as const}
                  value={player.beard ? 'si' : 'no'}
                  label="Barba"
                  onChange={(v) => edit({ beard: v === 'si' })}
                />
                <span className="pm-label">Altura</span>
                <Chips options={HEIGHTS} value={player.height} label="Altura" onChange={(height) => edit({ height })} />
                <span className="pm-label">Contextura</span>
                <Chips options={BUILDS} value={player.build} label="Contextura" onChange={(build) => edit({ build })} />
              </>
            )}

            {tab === 'clothes' && (
              <>
                <span className="pm-label">Camiseta</span>
                <Chips options={SHIRT_TYPES} value={player.shirt} label="Tipo de camiseta" onChange={(shirt) => edit({ shirt })} />
                <span className="pm-label">Color de la camiseta</span>
                <Swatches colors={TEAM_COLORS} value={player.shirtColor} label="Color de la camiseta" allowNone="Del equipo" onChange={(c) => edit({ shirtColor: c })} />
                <span className="pm-label">Short</span>
                <Chips options={SHORTS_LENGTHS} value={player.shorts} label="Largo del short" onChange={(shorts) => edit({ shorts })} />
                <span className="pm-label">Calcetas</span>
                <Chips options={SOCK_TYPES} value={player.socks} label="Calcetas" onChange={(socks) => edit({ socks })} />
                <span className="pm-label">Zapatillas</span>
                <Swatches colors={SHOE_COLORS} value={player.shoeColor} label="Color de las zapatillas" onChange={(c) => c && edit({ shoeColor: c })} />
              </>
            )}

            {tab === 'style' && (
              <>
                <span className="pm-label">Celebración de gol</span>
                <Chips
                  options={CELEBRATIONS}
                  value={player.celebration}
                  label="Celebración de gol"
                  onChange={(celebration) => {
                    edit({ celebration });
                    play('celebrate');
                  }}
                />
                <button type="button" className="pm-btn ghost small" style={{ marginTop: 10 }} onClick={() => play('celebrate')}>
                  Ver celebración
                </button>
                <span className="pm-label" style={{ marginTop: 20 }}>
                  Gesto de entrada
                </span>
                <Chips
                  options={ENTRY_GESTURES}
                  value={player.entry}
                  label="Gesto de entrada"
                  onChange={(entry) => {
                    edit({ entry });
                    play('entry');
                  }}
                />
                <button type="button" className="pm-btn ghost small" style={{ marginTop: 10 }} onClick={() => play('entry')}>
                  Ver gesto
                </button>
                <p className="pm-small pm-dim" style={{ marginTop: 16 }}>
                  El gesto de entrada lo hace antes del partido, cuando los equipos saludan. La celebración, cada vez que su equipo mete un gol.
                </p>
              </>
            )}

            {tab === 'stats' && (
              <>
                <p className="pm-small pm-dim" style={{ margin: '0 0 12px' }}>
                  Repartí {STAT_POINTS} puntos. Cada estadística va de {STAT_MIN} a {STAT_MAX}; para subir una, tenés que bajar otra.
                </p>
                {STAT_KEYS.map((key) => {
                  const value = player.stats[key];
                  return (
                    <div key={key} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <b style={{ width: 86, fontSize: 14 }}>{STAT_LABELS[key]}</b>
                        <button
                          type="button"
                          className="pm-step"
                          aria-label={`Bajar ${STAT_LABELS[key]}`}
                          disabled={value <= STAT_MIN}
                          onClick={() => {
                            menuSound('select');
                            edit({ stats: changeStat(player.stats, key, -1) });
                          }}
                        >
                          −
                        </button>
                        <div className="pm-bar" role="meter" aria-label={STAT_LABELS[key]} aria-valuemin={STAT_MIN} aria-valuemax={STAT_MAX} aria-valuenow={value}>
                          {Array.from({ length: STAT_MAX }, (_, i) => (
                            <i key={i} className={i < value ? 'on' : ''} />
                          ))}
                        </div>
                        <button
                          type="button"
                          className="pm-step"
                          aria-label={`Subir ${STAT_LABELS[key]}`}
                          disabled={value >= STAT_MAX || freePoints(player.stats) <= 0}
                          onClick={() => {
                            menuSound('select');
                            edit({ stats: changeStat(player.stats, key, 1) });
                          }}
                        >
                          +
                        </button>
                      </div>
                      <span className="pm-small pm-dim" style={{ marginLeft: 96, display: 'block' }}>
                        {STAT_HINTS[key]}
                      </span>
                    </div>
                  );
                })}
                <p className="pm-small" style={{ margin: 0, color: freePoints(player.stats) > 0 ? 'var(--sodium)' : 'var(--chalk-dim)' }}>
                  {freePoints(player.stats) > 0 ? `Te quedan ${freePoints(player.stats)} puntos por repartir.` : 'Repartiste todos los puntos.'}
                </p>
              </>
            )}
          </div>
        </Panel>
      </div>

      <footer className="pm-foot">
        <div className="pm-foot-group">
          <button type="button" className="pm-btn ghost small" onClick={() => { menuSound('back'); onBack(); }}>
            Volver
          </button>
          <button type="button" className="pm-btn ghost small" onClick={() => { menuSound('select'); onRandom(); }}>
            Aleatorio
          </button>
          <button
            type="button"
            className="pm-btn ghost small"
            onClick={() => {
              menuSound('select');
              if (confirmReset) {
                setConfirmReset(false);
                onReset();
              } else setConfirmReset(true);
            }}
          >
            {confirmReset ? 'Tocá otra vez para borrar' : 'Restablecer'}
          </button>
        </div>
        <button type="button" className="pm-btn" onClick={() => { menuSound('confirm'); onConfirm(); }}>
          Confirmar equipo
        </button>
      </footer>
    </div>
  );
}
