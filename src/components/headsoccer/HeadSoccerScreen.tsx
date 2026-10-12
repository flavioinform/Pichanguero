import { useEffect, useState } from 'react';
import { colors, fonts } from '../../theme';
import { fetchCountries, type CountryOption } from '../../lib/careerData';
import { ModeCard } from '../gato/ModeCard';
import { OnlineIcon, CpuIcon, LocalPairIcon } from '../gato/ModeIcons';
import { HeadSoccerGame } from './HeadSoccerGame';
import { HeadSoccerOnlineScreen } from './HeadSoccerOnlineScreen';
import { CountryPickStep } from './CountryPickStep';
import type { HeadSoccerMode } from './types';

interface HeadSoccerScreenProps {
  onBack: () => void;
}

type Step = 'mode' | 'pick-p1' | 'pick-p2' | 'play' | 'online';

export function HeadSoccerScreen({ onBack }: HeadSoccerScreenProps) {
  const [step, setStep] = useState<Step>('mode');
  const [mode, setMode] = useState<HeadSoccerMode>('cpu');
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [p1Country, setP1Country] = useState<CountryOption | null>(null);
  const [p2Country, setP2Country] = useState<CountryOption | null>(null);

  useEffect(() => {
    fetchCountries()
      .then(setCountries)
      .catch(() => setCountries([]));
  }, []);

  function chooseMode(m: HeadSoccerMode) {
    setMode(m);
    setStep('pick-p1');
  }

  function choosePlayer1(c: CountryOption) {
    setP1Country(c);
    if (mode === 'cpu') {
      setP2Country(pickCpuCountry(countries, c));
      setStep('play');
    } else {
      setStep('pick-p2');
    }
  }

  function choosePlayer2(c: CountryOption) {
    setP2Country(c);
    setStep('play');
  }

  if (step === 'online') {
    return <HeadSoccerOnlineScreen onBack={() => setStep('mode')} />;
  }

  if (step === 'play' && p1Country && p2Country) {
    return <HeadSoccerGame mode={mode} p1CountryName={p1Country.name} p2CountryName={p2Country.name} onBack={onBack} />;
  }

  if (step === 'pick-p1') {
    return (
      <CountryPickStep
        title={mode === 'cpu' ? 'Elegí tu país' : 'Jugador 1: elegí país'}
        countries={countries}
        onChoose={choosePlayer1}
        onBack={() => setStep('mode')}
      />
    );
  }

  if (step === 'pick-p2' && mode === 'local2p') {
    return (
      <CountryPickStep
        title="Jugador 2: elegí país"
        countries={countries}
        excludeId={p1Country?.id}
        onChoose={choosePlayer2}
        onBack={() => setStep('pick-p1')}
      />
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        zIndex: 2,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 40,
      }}
    >
      <h1
        style={{
          fontFamily: fonts.display,
          fontSize: 48,
          margin: 0,
          color: '#fff',
          textTransform: 'uppercase',
          textShadow: '0 2px 18px rgba(0,0,0,0.6)',
        }}
      >
        Head Soccer
      </h1>

      <div style={{ display: 'flex', alignItems: 'stretch', gap: 28 }}>
        <ModeCard
          icon={<CpuIcon />}
          label="Vs CPU"
          description="Un jugador contra la máquina"
          onClick={() => chooseMode('cpu')}
        />
        <ModeCard
          icon={<LocalPairIcon />}
          label="2 jugadores"
          description="Mismo teclado: P1 con A/D/W/S, P2 con las flechas"
          onClick={() => chooseMode('local2p')}
        />
        <ModeCard
          icon={<OnlineIcon />}
          label="Jugar online"
          description="Creá una sala o unite con un código"
          onClick={() => setStep('online')}
        />
      </div>

      <button
        onClick={onBack}
        style={{
          padding: '10px 24px',
          background: 'none',
          border: '1px solid rgba(255,255,255,0.25)',
          color: colors.textSecondary,
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: 0.5,
          cursor: 'pointer',
          textTransform: 'uppercase',
        }}
      >
        Volver al menú
      </button>
    </div>
  );
}

function pickCpuCountry(countries: CountryOption[], exclude: CountryOption): CountryOption {
  const pool = countries.filter((c) => c.id !== exclude.id);
  if (pool.length === 0) return exclude;
  return pool[Math.floor(Math.random() * pool.length)];
}
