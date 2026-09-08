import { useState } from 'react';
import { colors, fonts } from '../../theme';
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
        Gato futbolero
      </h1>

      <div style={{ display: 'flex', alignItems: 'stretch', gap: 28 }}>
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
