import { useState } from 'react';
import { ModeSelectLayout } from '../ModeSelectLayout';
import { GatoOnlineScreen } from './GatoOnlineScreen';
import { GatoOfflineScreen } from './GatoOfflineScreen';
import { ModeCard } from './ModeCard';
import { OnlineIcon, CpuIcon } from './ModeIcons';

interface GatoScreenProps {
  onBack: () => void;
}

type Mode = 'online' | 'offline' | null;

export function GatoScreen({ onBack }: GatoScreenProps) {
  const [mode, setMode] = useState<Mode>(null);

  if (mode === 'online') return <GatoOnlineScreen onBack={() => setMode(null)} />;
  if (mode === 'offline') return <GatoOfflineScreen onBack={() => setMode(null)} />;

  return (
    <ModeSelectLayout title="Gato futbolero" onBack={onBack}>
      <ModeCard
        icon={<OnlineIcon />}
        label="Jugar online"
        description="Por turnos con otro jugador, vía código de invitación"
        onClick={() => setMode('online')}
      />
      <ModeCard
        icon={<CpuIcon />}
        label="Jugar offline"
        description="Un jugador contra la CPU"
        onClick={() => setMode('offline')}
      />
    </ModeSelectLayout>
  );
}
