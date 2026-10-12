import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { colors, fonts } from '../../theme';
import { useAuth } from '../../hooks/useAuth';
import { useHeadSoccerSession } from '../../hooks/useHeadSoccerSession';
import { createHeadSoccerSession, joinHeadSoccerSession, startHeadSoccerMatch } from '../../lib/headSoccerSession';
import { fetchCountries, type CountryOption } from '../../lib/careerData';
import { CountryPickStep } from './CountryPickStep';
import { HeadSoccerGame } from './HeadSoccerGame';

interface HeadSoccerOnlineScreenProps {
  onBack: () => void;
}

type View = 'pick-country' | 'choose' | 'join';

export function HeadSoccerOnlineScreen({ onBack }: HeadSoccerOnlineScreenProps) {
  const { userId, loading: authLoading } = useAuth();
  const [view, setView] = useState<View>('pick-country');
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [myCountry, setMyCountry] = useState<CountryOption | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchCountries()
      .then(setCountries)
      .catch(() => setCountries([]));
  }, []);

  const { session, loading: sessionLoading, remoteInputRef, sendInput, connected } = useHeadSoccerSession(sessionId);

  if (authLoading) return <CenteredMessage text="Conectando…" />;

  if (view === 'pick-country' && !myCountry) {
    return (
      <CountryPickStep
        title="Elegí tu país"
        countries={countries}
        onChoose={(c) => {
          setMyCountry(c);
          setView('choose');
        }}
        onBack={onBack}
      />
    );
  }

  async function handleCreate() {
    if (!myCountry) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      const created = await createHeadSoccerSession(myCountry.name);
      setSessionId(created.id);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo crear la sala.');
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin() {
    if (!myCountry || !joinCodeInput.trim()) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      const joined = await joinHeadSoccerSession(joinCodeInput.trim(), myCountry.name);
      setSessionId(joined.id);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo unir a la sala.');
    } finally {
      setBusy(false);
    }
  }

  async function handleStart() {
    if (!session) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      await startHeadSoccerMatch(session);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo iniciar el partido.');
    } finally {
      setBusy(false);
    }
  }

  if (sessionId && (sessionLoading || !session)) {
    return <CenteredMessage text="Cargando sala…" />;
  }

  if (session && userId) {
    const isHost = session.host_id === userId;

    if (session.status === 'playing' || session.status === 'finished') {
      return (
        <HeadSoccerGame
          mode="online"
          p1CountryName={session.host_country}
          p2CountryName={session.guest_country ?? 'Desconocido'}
          onBack={onBack}
          online={{ isHost, remoteInputRef, sendInput, connected }}
        />
      );
    }

    // status === 'waiting' or 'ready' — lobby
    return (
      <CenteredCard>
        <Title>Head Soccer online</Title>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>
            Código para invitar
          </span>
          <div
            style={{
              fontFamily: fonts.display,
              fontSize: 36,
              letterSpacing: 6,
              color: colors.accentLight,
              border: `2px solid ${colors.accent}`,
              padding: '10px 24px',
            }}
          >
            {session.join_code}
          </div>
        </div>

        {session.status === 'waiting' && (
          <div style={{ color: colors.textSecondary, fontSize: 14 }}>Esperando a que se una el rival…</div>
        )}

        {session.status === 'ready' &&
          (isHost ? (
            <PrimaryButton label={busy ? 'Iniciando…' : 'Empezar partido'} disabled={busy} onClick={handleStart} />
          ) : (
            <div style={{ color: colors.textSecondary, fontSize: 14 }}>Esperando a que el host empiece…</div>
          ))}

        {errorMsg && <ErrorText text={errorMsg} />}
        <SecondaryButton label="Salir" onClick={onBack} />
      </CenteredCard>
    );
  }

  if (view === 'join') {
    return (
      <CenteredCard>
        <Title>Unirse a sala</Title>
        <TextInput
          value={joinCodeInput}
          onChange={(v) => setJoinCodeInput(v.toUpperCase())}
          placeholder="Código de 6 letras"
          onEnter={handleJoin}
        />
        {errorMsg && <ErrorText text={errorMsg} />}
        <PrimaryButton label={busy ? 'Uniendo…' : 'Unirse'} disabled={busy || !joinCodeInput.trim()} onClick={handleJoin} />
        <SecondaryButton label="Volver" onClick={() => setView('choose')} />
      </CenteredCard>
    );
  }

  return (
    <CenteredCard>
      <Title>Head Soccer online</Title>
      <p style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center', maxWidth: 420, margin: 0 }}>
        Creá una sala y compartí el código, o unite a la de un amigo. Jugás con tu país: {myCountry?.name}.
      </p>
      {errorMsg && <ErrorText text={errorMsg} />}
      <PrimaryButton label={busy ? 'Creando…' : 'Crear sala'} disabled={busy} onClick={handleCreate} />
      <SecondaryButton label="Unirse con código" onClick={() => setView('join')} />
      <SecondaryButton label="Volver" onClick={onBack} />
    </CenteredCard>
  );
}

function CenteredCard({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: 'relative',
        zIndex: 2,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
          padding: '40px 48px',
          background: colors.surface,
          borderTop: `3px solid ${colors.accent}`,
          borderLeft: '1px solid rgba(255,255,255,0.12)',
          borderRight: '1px solid rgba(255,255,255,0.12)',
          borderBottom: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 0 60px rgba(0,0,0,0.5)',
          maxWidth: 640,
          width: '100%',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function CenteredMessage({ text }: { text: string }) {
  return (
    <CenteredCard>
      <div style={{ color: colors.textSecondary, fontSize: 15 }}>{text}</div>
    </CenteredCard>
  );
}

function Title({ children }: { children: ReactNode }) {
  return (
    <h1 style={{ fontFamily: fonts.display, fontSize: 36, margin: 0, color: '#fff', textTransform: 'uppercase' }}>
      {children}
    </h1>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  onEnter,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  onEnter: () => void;
}) {
  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && onEnter()}
      placeholder={placeholder}
      style={{
        padding: '12px 16px',
        fontSize: 16,
        background: colors.surfaceRaised,
        border: `1px solid ${colors.accent}`,
        color: '#fff',
        fontFamily: fonts.body,
        minWidth: 260,
        textAlign: 'center',
      }}
    />
  );
}

function PrimaryButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '14px 34px',
        background: colors.accent,
        border: 'none',
        color: '#fff',
        fontWeight: 800,
        fontSize: 15,
        letterSpacing: 1,
        textTransform: 'uppercase',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        minWidth: 220,
      }}
    >
      {label}
    </button>
  );
}

function SecondaryButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
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
      {label}
    </button>
  );
}

function ErrorText({ text }: { text: string }) {
  return <div style={{ color: colors.danger, fontSize: 14 }}>{text}</div>;
}
