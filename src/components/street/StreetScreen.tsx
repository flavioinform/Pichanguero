import { useEffect, useState } from 'react';
import { ModeSelectLayout } from '../ModeSelectLayout';
import { fetchCountries, type CountryOption } from '../../lib/careerData';
import { ModeCard } from '../gato/ModeCard';
import { CpuIcon } from '../gato/ModeIcons';
import { CountryPickStep } from '../headsoccer/CountryPickStep';
import type { Difficulty } from '../../lib/street/engine';
import { StreetGame } from './StreetGame';

interface StreetScreenProps {
  onBack: () => void;
}

type Step = 'difficulty' | 'pick' | 'play';

const LEVELS: Array<{ id: Difficulty; label: string; description: string }> = [
  { id: 'easy', label: 'Fácil', description: 'La CPU es lenta y apunta mal' },
  { id: 'normal', label: 'Normal', description: 'Un partido parejo' },
  { id: 'hard', label: 'Difícil', description: 'La CPU quita rápido y no perdona' },
];

export function StreetScreen({ onBack }: StreetScreenProps) {
  const [step, setStep] = useState<Step>('difficulty');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [mine, setMine] = useState<CountryOption | null>(null);
  const [rival, setRival] = useState<CountryOption | null>(null);

  useEffect(() => {
    fetchCountries()
      .then(setCountries)
      .catch(() => setCountries([]));
  }, []);

  function choose(c: CountryOption) {
    const pool = countries.filter((x) => x.id !== c.id);
    setMine(c);
    setRival(pool.length ? pool[Math.floor(Math.random() * pool.length)] : c);
    setStep('play');
  }

  if (step === 'play' && mine && rival) {
    return <StreetGame p1CountryName={mine.name} p2CountryName={rival.name} difficulty={difficulty} onBack={onBack} />;
  }

  if (step === 'pick') {
    return <CountryPickStep title="Elegí tu país" countries={countries} onChoose={choose} onBack={() => setStep('difficulty')} />;
  }

  return (
    <ModeSelectLayout title="Fútbol callejero 3v3" onBack={onBack}>
      {LEVELS.map((l) => (
        <ModeCard
          key={l.id}
          icon={<CpuIcon />}
          label={l.label}
          description={l.description}
          onClick={() => {
            setDifficulty(l.id);
            setStep('pick');
          }}
        />
      ))}
    </ModeSelectLayout>
  );
}
