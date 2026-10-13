import { useState } from 'react';
import { ModeSelectLayout } from '../ModeSelectLayout';
import { ModeCard } from '../gato/ModeCard';
import { OnlineIcon, CpuIcon } from '../gato/ModeIcons';
import { AuctionOnlineScreen } from './AuctionOnlineScreen';
import { AuctionOfflineScreen } from './AuctionOfflineScreen';

interface AuctionScreenProps {
  onBack: () => void;
}

type Mode = 'online' | 'offline' | null;

export function AuctionScreen({ onBack }: AuctionScreenProps) {
  const [mode, setMode] = useState<Mode>(null);

  if (mode === 'online') return <AuctionOnlineScreen onBack={() => setMode(null)} />;
  if (mode === 'offline') return <AuctionOfflineScreen onBack={() => setMode(null)} />;

  return (
    <ModeSelectLayout title="Subasta futbolera" onBack={onBack}>
      <ModeCard
        icon={<OnlineIcon />}
        label="Jugar online"
        description="Hasta 4 jugadores, vía código de invitación"
        onClick={() => setMode('online')}
      />
      <ModeCard
        icon={<CpuIcon />}
        label="Contra la CPU"
        description="Pujá por jugadores misteriosos contra la máquina"
        onClick={() => setMode('offline')}
      />
    </ModeSelectLayout>
  );
}
