import type { Difficulty } from '../../../lib/street/engine';
import { PLAYER_ROLES, type StreetTeam } from '../../../lib/street/team';
import { Crest } from './Crest';
import { menuSound } from './menuSound';
import { TeamPreview3d } from './TeamPreview3d';
import { Chips, Panel } from './ui';

interface SummaryScreenProps {
  team: StreetTeam;
  rival: StreetTeam;
  difficulty: Difficulty;
  onDifficulty: (d: Difficulty) => void;
  onNewRival: () => void;
  onEdit: () => void;
  onPlay: () => void;
  onOnline: () => void;
  onBack: () => void;
}

const LEVELS = [
  { id: 'easy', label: 'Fácil' },
  { id: 'normal', label: 'Normal' },
  { id: 'hard', label: 'Difícil' },
] as const;

/** Resumen: tu equipo en formación, el rival que salió y el botón de jugar. */
export function SummaryScreen({ team, rival, difficulty, onDifficulty, onNewRival, onEdit, onPlay, onOnline, onBack }: SummaryScreenProps) {
  return (
    <div className="pm-screen">
      <header className="pm-head">
        <h1 className="pm-title pm-h2">Listos para salir</h1>
      </header>

      <div className="pm-two pm-stagger">
        {/* tu equipo, en formación */}
        <Panel flat style={{ display: 'flex', flexDirection: 'column', minHeight: 360 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Crest crest={team.crest} size={54} title={`Escudo de ${team.name}`} />
            <div>
              <h2 className="pm-title pm-h2">{team.name}</h2>
              <span className="pm-small pm-dim">
                {team.players.map((p) => `${p.number} ${p.nickname}`).join('  ·  ')}
              </span>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 260, position: 'relative' }}>
            <TeamPreview3d team={team} slot={1} mode="team" />
          </div>
          <button type="button" className="pm-btn ghost small" style={{ alignSelf: 'start' }} onClick={() => { menuSound('select'); onEdit(); }}>
            Editar equipo
          </button>
        </Panel>

        <div className="pm-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* el rival */}
          <Panel>
            <h2 className="pm-title pm-h3" style={{ marginBottom: 12 }}>
              Tu rival
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Crest crest={rival.crest} size={64} title={`Escudo de ${rival.name}`} />
              <div style={{ minWidth: 0 }}>
                <b style={{ fontSize: 20, display: 'block' }}>{rival.name}</b>
                <span className="pm-small pm-dim">{rival.players.map((p) => p.nickname).join(', ')}</span>
                <div style={{ display: 'flex', gap: 0, width: 120, height: 8, marginTop: 8 }} aria-hidden="true">
                  <span style={{ flex: 2, background: rival.primary }} />
                  <span style={{ flex: 1, background: rival.secondary }} />
                </div>
              </div>
            </div>
            <button type="button" className="pm-btn ghost small" style={{ marginTop: 14 }} onClick={() => { menuSound('select'); onNewRival(); }}>
              Otro rival
            </button>
          </Panel>

          <Panel>
            <h2 className="pm-title pm-h3" style={{ marginBottom: 12 }}>
              Dificultad
            </h2>
            <Chips options={LEVELS} value={difficulty} label="Dificultad" onChange={onDifficulty} />
            <p className="pm-small pm-dim" style={{ marginBottom: 0 }}>
              {difficulty === 'easy' && 'La CPU es lenta y apunta mal.'}
              {difficulty === 'normal' && 'Un partido parejo.'}
              {difficulty === 'hard' && 'La CPU quita rápido y no perdona.'}
            </p>
          </Panel>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <button type="button" className="pm-btn big" onClick={() => { menuSound('confirm'); onPlay(); }}>
              Jugar
            </button>
            <button type="button" className="pm-btn ghost" onClick={() => { menuSound('confirm'); onOnline(); }}>
              Jugar online
            </button>
          </div>
        </div>
      </div>

      <footer className="pm-foot">
        <button type="button" className="pm-btn ghost small" onClick={() => { menuSound('back'); onBack(); }}>
          Volver
        </button>
        <span className="pm-small pm-dim">{PLAYER_ROLES.join(' · ')}</span>
      </footer>
    </div>
  );
}
