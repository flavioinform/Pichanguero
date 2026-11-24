import { useEffect, useState } from 'react';
import type { StreetSettings } from '../../../lib/street/settings';
import { menuSound } from './menuSound';
import { Panel, Switch } from './ui';

interface SettingsScreenProps {
  settings: StreetSettings;
  onChange: (patch: Partial<StreetSettings>) => void;
  onResetTeam: () => void;
  onBack: () => void;
}

export function SettingsScreen({ settings, onChange, onResetTeam, onBack }: SettingsScreenProps) {
  const [confirmReset, setConfirmReset] = useState(false);
  useEffect(() => {
    if (!confirmReset) return;
    const t = setTimeout(() => setConfirmReset(false), 2800);
    return () => clearTimeout(t);
  }, [confirmReset]);

  return (
    <div className="pm-screen">
      <header className="pm-head">
        <h1 className="pm-title pm-h2">Ajustes</h1>
      </header>

      <div className="pm-stagger pm-scroll" style={{ padding: '0 28px', flex: 1, maxWidth: 640, width: '100%' }}>
        <Panel>
          <Switch label="Sonido" hint="Efectos del partido y público" checked={settings.sound} onChange={(sound) => onChange({ sound })} />
          <Switch
            label="Cambio de jugador"
            hint="Automático: pasás solo al compañero más cerca de la pelota. Manual: cambiás únicamente con Q o Espacio."
            checked={settings.manualSwitch}
            onText="Manual"
            offText="Automático"
            onChange={(manualSwitch) => onChange({ manualSwitch })}
          />
          <Switch label="Ayuda de controles" hint="La línea con las teclas debajo de la cancha" checked={settings.controlsHelp} onChange={(controlsHelp) => onChange({ controlsHelp })} />
        </Panel>

        <Panel style={{ marginTop: 16 }}>
          <h2 className="pm-title pm-h3">Tu equipo guardado</h2>
          <p className="pm-small pm-dim">Se guarda en este navegador. Si lo borrás, vuelve el equipo de ejemplo.</p>
          <button
            type="button"
            className="pm-btn ghost small"
            onClick={() => {
              menuSound('select');
              if (confirmReset) {
                setConfirmReset(false);
                onResetTeam();
              } else setConfirmReset(true);
            }}
          >
            {confirmReset ? 'Tocá otra vez para borrar' : 'Borrar mi equipo'}
          </button>
        </Panel>
      </div>

      <footer className="pm-foot">
        <button type="button" className="pm-btn ghost small" onClick={() => { menuSound('back'); onBack(); }}>
          Volver
        </button>
        <span />
      </footer>
    </div>
  );
}
