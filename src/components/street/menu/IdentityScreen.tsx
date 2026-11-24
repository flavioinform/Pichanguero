import {
  CREST_SHAPES,
  CREST_SYMBOLS,
  TEAM_COLORS,
  TEAM_NAME_MAX,
  cleanAbbr,
  suggestAbbr,
  type StreetTeam,
} from '../../../lib/street/team';
import { Crest } from './Crest';
import { menuSound } from './menuSound';
import { Chips, Panel, Swatches } from './ui';

interface IdentityScreenProps {
  team: StreetTeam;
  onChange: (update: (team: StreetTeam) => StreetTeam) => void;
  onDone: () => void;
}

/** Nombre, abreviatura, escudo y colores del equipo. */
export function IdentityScreen({ team, onChange, onDone }: IdentityScreenProps) {
  const set = (patch: Partial<StreetTeam>) => onChange((t) => ({ ...t, ...patch }));
  const setCrest = (patch: Partial<StreetTeam['crest']>) => onChange((t) => ({ ...t, crest: { ...t.crest, ...patch } }));
  const remaining = TEAM_NAME_MAX - team.name.length;

  return (
    <div className="pm-screen">
      <header className="pm-head">
        <h1 className="pm-title pm-h2">Identidad del equipo</h1>
      </header>

      <div className="pm-two pm-stagger">
        <Panel className="pm-scroll">
          <label className="pm-label" htmlFor="pm-team-name">
            Nombre del equipo
          </label>
          <input
            id="pm-team-name"
            className="pm-input"
            maxLength={TEAM_NAME_MAX}
            value={team.name}
            aria-describedby="pm-team-name-count"
            onChange={(e) => {
              const name = e.target.value;
              // mientras la abreviatura sea la sugerida, acompaña al nombre
              set({ name, abbr: team.abbr === suggestAbbr(team.name) ? suggestAbbr(name) : team.abbr });
            }}
            onBlur={() => !team.name.trim() && set({ name: 'Mi equipo', abbr: suggestAbbr('Mi equipo') })}
          />
          <p id="pm-team-name-count" className="pm-small pm-dim" style={{ margin: '6px 0 0' }}>
            {remaining === 0 ? 'Llegaste al máximo de 16 letras.' : `Te quedan ${remaining} letras.`}
          </p>

          <label className="pm-label" htmlFor="pm-abbr">
            Abreviatura de 3 letras
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              id="pm-abbr"
              className="pm-input"
              value={team.abbr}
              maxLength={3}
              onChange={(e) => set({ abbr: cleanAbbr(e.target.value) })}
              onBlur={() => team.abbr.length < 3 && set({ abbr: suggestAbbr(team.name) })}
              style={{ width: 96, textAlign: 'center', fontFamily: "'Anton', Impact, sans-serif", fontSize: 24, letterSpacing: '0.1em' }}
            />
            <button type="button" className="pm-btn ghost small" onClick={() => { menuSound('select'); set({ abbr: suggestAbbr(team.name) }); }}>
              Sugerir
            </button>
          </div>

          <span className="pm-label">Color principal</span>
          <Swatches
            colors={TEAM_COLORS}
            value={team.primary}
            label="Color principal"
            onChange={(c) => c && onChange((t) => ({ ...t, primary: c, crest: { ...t.crest, color1: t.crest.color1 === t.primary ? c : t.crest.color1 } }))}
          />
          <span className="pm-label">Color secundario</span>
          <Swatches
            colors={TEAM_COLORS}
            value={team.secondary}
            label="Color secundario"
            onChange={(c) => c && onChange((t) => ({ ...t, secondary: c, crest: { ...t.crest, color2: t.crest.color2 === t.secondary ? c : t.crest.color2 } }))}
          />
          <p className="pm-small pm-dim" style={{ marginTop: 8 }}>
            El principal tiñe la camiseta y todo este menú. El secundario es para el short, las calcetas y el número.
          </p>

          <h2 className="pm-title pm-h3" style={{ margin: '26px 0 4px' }}>
            Escudo
          </h2>
          <span className="pm-label">Forma</span>
          <Chips options={CREST_SHAPES} value={team.crest.shape} label="Forma del escudo" onChange={(shape) => setCrest({ shape })} />
          <span className="pm-label">Símbolo</span>
          <Chips options={CREST_SYMBOLS} value={team.crest.symbol} label="Símbolo del escudo" onChange={(symbol) => setCrest({ symbol })} />
          <span className="pm-label">Color del fondo</span>
          <Swatches colors={TEAM_COLORS} value={team.crest.color1} label="Color del fondo del escudo" onChange={(c) => c && setCrest({ color1: c })} />
          <span className="pm-label">Color del símbolo</span>
          <Swatches colors={TEAM_COLORS} value={team.crest.color2} label="Color del símbolo" onChange={(c) => c && setCrest({ color2: c })} />
          <button
            type="button"
            className="pm-btn ghost small"
            style={{ marginTop: 12 }}
            onClick={() => {
              menuSound('select');
              setCrest({ color1: team.primary, color2: team.secondary });
            }}
          >
            Usar los colores del equipo
          </button>
        </Panel>

        {/* vista previa: el escudo y cómo se ve el equipo */}
        <Panel flat style={{ display: 'grid', placeItems: 'center', alignContent: 'center', gap: 18, textAlign: 'center', minHeight: 320 }}>
          <Crest crest={team.crest} size={170} title={`Escudo de ${team.name}`} />
          <div>
            <h2 className="pm-title pm-h1" style={{ wordBreak: 'break-word' }}>
              {team.name || 'Sin nombre'}
            </h2>
            <p className="pm-title" style={{ fontSize: 28, color: 'var(--team)', marginTop: 8 }}>
              {team.abbr}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 0, width: 220, height: 14 }} aria-hidden="true">
            <span style={{ flex: 2, background: team.primary }} />
            <span style={{ flex: 1, background: team.secondary }} />
          </div>
        </Panel>
      </div>

      <footer className="pm-foot">
        <span />
        <button type="button" className="pm-btn" onClick={() => { menuSound('confirm'); onDone(); }}>
          Listo
        </button>
      </footer>
    </div>
  );
}
