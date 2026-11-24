import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Difficulty } from '../../lib/street/engine';
import { loadSettings, saveSettings, type StreetSettings } from '../../lib/street/settings';
import {
  colorDistance,
  distinctPair,
  loadTeam,
  randomRival,
  randomTeam,
  resetTeam,
  saveTeam,
  type StreetTeam,
} from '../../lib/street/team';
import { readableOn } from '../../lib/countryVisuals';
import { StreetGame } from './StreetGame';
import { StreetOnlineScreen } from './StreetOnlineScreen';
import { IdentityScreen } from './menu/IdentityScreen';
import { MENU_CSS, MENU_LAYOUT_CSS } from './menu/menuStyles';
import { menuSound } from './menu/menuSound';
import { SettingsScreen } from './menu/SettingsScreen';
import { StreetMainMenu } from './menu/StreetMainMenu';
import { SummaryScreen } from './menu/SummaryScreen';
import { TeamScreen } from './menu/TeamScreen';

interface StreetScreenProps {
  onBack: () => void;
}

type Step = 'menu' | 'team' | 'identity' | 'summary' | 'settings' | 'play' | 'online';

/** Un color de acento que se vea sobre el asfalto: si el del equipo es casi negro, usa el secundario o un gris claro. */
function accentOf(team: StreetTeam): string {
  const lum = (c: string) => colorDistance(c, '#000000');
  if (lum(team.primary) > 90) return team.primary;
  return lum(team.secondary) > 90 ? team.secondary : '#9aa3ad';
}

/**
 * El flujo completo de POTRERO: menú principal → Mi equipo → identidad →
 * resumen → partido. El equipo se guarda solo en el navegador cada vez que lo
 * cambiás, y es el que juega (en el partido, el marcador, la intro y el online).
 */
export function StreetScreen({ onBack }: StreetScreenProps) {
  const [step, setStep] = useState<Step>('menu');
  const [team, setTeam] = useState<StreetTeam>(loadTeam);
  const [rival, setRival] = useState<StreetTeam>(() => randomRival(loadTeam()));
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [settings, setSettings] = useState<StreetSettings>(loadSettings);

  // guarda el equipo en cuanto cambia (menos la primera vez, que es solo cargarlo)
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    saveTeam(team);
  }, [team]);

  // el rival nunca puede parecerse a tu equipo, aunque cambies tus colores
  useEffect(() => {
    if (colorDistance(rival.primary, team.primary) < 120) setRival(randomRival(team));
  }, [team, rival]);

  const updateTeam = useCallback((update: (t: StreetTeam) => StreetTeam) => setTeam((t) => update(t)), []);
  const updateSettings = useCallback((patch: Partial<StreetSettings>) => {
    setSettings((s) => {
      const next = { ...s, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  // Escape vuelve un paso atrás en los menús
  useEffect(() => {
    const back: Partial<Record<Step, Step>> = { team: 'menu', identity: 'team', summary: 'menu', settings: 'menu' };
    const onKey = (e: KeyboardEvent) => {
      const target = back[step];
      if (e.key !== 'Escape' || !target) return;
      menuSound('back');
      setStep(target);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step]);

  if (step === 'play') {
    return (
      <StreetGame
        teams={distinctPair(team, rival)}
        difficulty={difficulty}
        onBack={() => {
          // cada partido nuevo es contra un rival nuevo
          setRival(randomRival(team));
          setStep('summary');
        }}
      />
    );
  }

  if (step === 'online') {
    return <StreetOnlineScreen team={team} onBack={() => setStep('summary')} />;
  }

  const vars = { '--team': accentOf(team), '--team-ink': readableOn(accentOf(team)) } as CSSProperties;

  return (
    <div className="pm" style={vars}>
      <style>{MENU_CSS + MENU_LAYOUT_CSS}</style>

      {step === 'menu' && (
        <StreetMainMenu team={team} onPlay={() => setStep('summary')} onTeam={() => setStep('team')} onSettings={() => setStep('settings')} onExit={onBack} />
      )}

      {step === 'team' && (
        <TeamScreen
          team={team}
          onChange={updateTeam}
          onBack={() => setStep('menu')}
          onIdentity={() => setStep('identity')}
          onConfirm={() => setStep('summary')}
          onRandom={() => setTeam(randomTeam())}
          onReset={() => setTeam(resetTeam())}
        />
      )}

      {step === 'identity' && <IdentityScreen team={team} onChange={updateTeam} onDone={() => setStep('team')} />}

      {step === 'summary' && (
        <SummaryScreen
          team={team}
          rival={rival}
          difficulty={difficulty}
          onDifficulty={setDifficulty}
          onNewRival={() => setRival(randomRival(team))}
          onEdit={() => setStep('team')}
          onPlay={() => setStep('play')}
          onOnline={() => setStep('online')}
          onBack={() => setStep('menu')}
        />
      )}

      {step === 'settings' && (
        <SettingsScreen
          settings={settings}
          onChange={updateSettings}
          onResetTeam={() => setTeam(resetTeam())}
          onBack={() => setStep('menu')}
        />
      )}
    </div>
  );
}
