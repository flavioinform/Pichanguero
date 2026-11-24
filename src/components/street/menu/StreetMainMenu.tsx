import { useMemo } from 'react';
import { randomRival, type StreetTeam } from '../../../lib/street/team';
import { Backdrop3d } from './Backdrop3d';
import { Crest } from './Crest';
import { menuSound } from './menuSound';

interface StreetMainMenuProps {
  team: StreetTeam;
  onPlay: () => void;
  onTeam: () => void;
  onSettings: () => void;
  onExit: () => void;
}

/** Menú principal: la cancha de noche de fondo y tres botones grandes. */
export function StreetMainMenu({ team, onPlay, onTeam, onSettings, onExit }: StreetMainMenuProps) {
  // el fondo muestra tu equipo contra uno cualquiera; no cambia mientras estás en el menú
  const rival = useMemo(() => randomRival(team), [team.primary]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="pm-screen">
      <Backdrop3d teams={[team, rival]} />
      <div className="pm-menu-wrap pm-stagger">
        <div style={{ marginBottom: 14 }}>
          <h1 className="pm-title pm-h1">Potrero</h1>
          <p className="pm-dim" style={{ margin: '10px 0 0', fontSize: 16 }}>
            Fútbol callejero, tres contra tres.
          </p>
        </div>
        <button type="button" className="pm-menu-item main" onClick={() => { menuSound('confirm'); onPlay(); }}>
          Jugar
        </button>
        <button type="button" className="pm-menu-item" onClick={() => { menuSound('select'); onTeam(); }}>
          Mi equipo
        </button>
        <button type="button" className="pm-menu-item" onClick={() => { menuSound('select'); onSettings(); }}>
          Ajustes
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 18 }}>
          <Crest crest={team.crest} size={42} title={`Escudo de ${team.name}`} />
          <div>
            <b style={{ display: 'block' }}>{team.name}</b>
            <button
              type="button"
              className="pm-small pm-dim"
              onClick={() => { menuSound('back'); onExit(); }}
              style={{ background: 'none', border: 0, padding: 0, textDecoration: 'underline', textUnderlineOffset: 3 }}
            >
              Volver a los juegos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
