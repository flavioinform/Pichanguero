import { useState } from 'react';
import { colors, fonts } from '../../theme';
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
        Subasta futbolera
      </h1>

      <div style={{ display: 'flex', alignItems: 'stretch', gap: 28 }}>
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
