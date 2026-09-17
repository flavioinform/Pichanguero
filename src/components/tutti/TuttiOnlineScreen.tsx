import { useState } from 'react';
import type { ReactNode } from 'react';
import { colors, fonts } from '../../theme';
import { useAuth } from '../../hooks/useAuth';
import { useTuttiSession } from '../../hooks/useTuttiSession';
import { createTuttiSession, joinTuttiSession, startTuttiRound } from '../../lib/tuttiSession';
import { CategoryPicker } from './CategoryPicker';
import { LetterPicker } from './LetterPicker';
import { TuttiRoundTable } from './TuttiRoundTable';

interface TuttiOnlineScreenProps {
  onBack: () => void;
}

type View = 'choose' | 'config' | 'join';

const DEFAULT_CATEGORY_KEYS = ['jugador', 'club', 'entrenador', 'pais', 'arquero', 'delantero'];

export function TuttiOnlineScreen({ onBack }: TuttiOnlineScreenProps) {
  const { userId, nickname, loading: authLoading, setNickname } = useAuth();
  const [view, setView] = useState<View>('choose');
  const [nicknameInput, setNicknameInput] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [roundsTotal, setRoundsTotal] = useState(5);
  const [categoryKeys, setCategoryKeys] = useState<string[]>(DEFAULT_CATEGORY_KEYS);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { session, players, answers, loading: sessionLoading } = useTuttiSession(sessionId);

  if (authLoading) return <CenteredMessage text="Conectando…" />;

  if (!nickname) {
    return (
      <CenteredCard>
        <Title>¿Cómo te llamás?</Title>
        <TextInput
          value={nicknameInput}
          onChange={setNicknameInput}
          placeholder="Tu apodo"
          onEnter={() => nicknameInput.trim() && setNickname(nicknameInput.trim())}
        />
        <PrimaryButton label="Continuar" disabled={!nicknameInput.trim()} onClick={() => setNickname(nicknameInput.trim())} />
      </CenteredCard>
    );
  }

  async function handleCreate() {
    if (categoryKeys.length < 4) {
      setErrorMsg('Elegí al menos 4 categorías.');
      return;
    }
    setBusy(true);
    setErrorMsg(null);
    try {
      const created = await createTuttiSession(nickname!, { maxPlayers, categoryKeys, roundsTotal });
      setSessionId(created.id);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo crear la sala.');
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin() {
    if (!joinCodeInput.trim()) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      const joined = await joinTuttiSession(joinCodeInput.trim(), nickname!);
      setSessionId(joined.id);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo unir a la sala.');
    } finally {
      setBusy(false);
    }
  }

  function handlePlayAgain() {
    setSessionId(null);
    setJoinCodeInput('');
    setErrorMsg(null);
    setView('choose');
  }

  if (sessionId && (sessionLoading || !session)) {
    return <CenteredMessage text="Cargando sala…" />;
  }

  if (session && userId) {
    const isHost = session.host_id === userId;

    if (session.status === 'finished') {
      const ranked = [...players].sort((a, b) => b.total_score - a.total_score);
      return (
        <CenteredCard>
          <Title>Resultado final</Title>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 280 }}>
            {ranked.map((p, i) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 16px',
                  background: i === 0 ? 'rgba(47,174,76,0.18)' : 'rgba(18,18,20,0.5)',
                  border: `1px solid ${i === 0 ? colors.accent : 'rgba(255,255,255,0.15)'}`,
                  color: '#fff',
                  fontWeight: i === 0 ? 800 : 500,
                }}
              >
                <span>{i === 0 ? '🏆 ' : ''}{p.nickname}</span>
                <span>{p.total_score}</span>
              </div>
            ))}
          </div>
          <PrimaryButton label="Jugar de nuevo" onClick={handlePlayAgain} />
          <SecondaryButton label="Volver al menú" onClick={onBack} />
        </CenteredCard>
      );
    }

    if (session.status !== 'waiting') {
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
            gap: 24,
            padding: '24px',
          }}
        >
          <TuttiRoundTable session={session} players={players} answers={answers} userId={userId} />
          {session.status === 'round_results' && isHost && (
            <LetterPicker onPick={(letter) => startTuttiRound(session, letter)} />
          )}
          {session.status === 'round_results' && !isHost && (
            <div style={{ color: colors.textSecondary, fontSize: 13 }}>Esperando a que el host arranque la próxima ronda…</div>
          )}
          <SecondaryButton label="Salir" onClick={onBack} />
        </div>
      );
    }

    // status === 'waiting' — lobby
    return (
      <CenteredCard>
        <Title>Sala de espera</Title>

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

        <SectionLabel>
          Jugadores ({players.length}/{session.max_players})
        </SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
          {players.map((p) => (
            <div
              key={p.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 16px',
                background: 'rgba(18,18,20,0.5)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              <span>{p.nickname}</span>
              {p.player_id === session.host_id && (
                <span style={{ color: colors.accentLight, fontSize: 12, textTransform: 'uppercase' }}>Host 👑</span>
              )}
            </div>
          ))}
        </div>

        {isHost ? (
          <>
            <SectionLabel>Elegí la letra para arrancar</SectionLabel>
            <LetterPicker onPick={(letter) => startTuttiRound(session, letter)} disabled={players.length < 2} />
            {players.length < 2 && (
              <div style={{ fontSize: 12, color: colors.textMuted }}>Esperando al menos otro jugador…</div>
            )}
          </>
        ) : (
          <div style={{ color: colors.textSecondary, fontSize: 14 }}>
            Esperando a que {players.find((p) => p.player_id === session.host_id)?.nickname ?? 'el host'} inicie la partida…
          </div>
        )}

        {errorMsg && <ErrorText text={errorMsg} />}
        <SecondaryButton label="Salir" onClick={onBack} />
      </CenteredCard>
    );
  }

  if (view === 'config') {
    return (
      <CenteredCard wide>
        <Title>Configurar sala</Title>

        <div style={{ display: 'flex', gap: 40 }}>
          <PillGroup label="Jugadores máx." options={[2, 3, 4]} value={maxPlayers} onChange={setMaxPlayers} />
          <PillGroup label="Rondas" options={[3, 5, 7, 10]} value={roundsTotal} onChange={setRoundsTotal} />
        </div>

        <SectionLabel>Categorías — así se va a ver la tabla</SectionLabel>
        <CategoryPicker selected={categoryKeys} onChange={setCategoryKeys} />

        {errorMsg && <ErrorText text={errorMsg} />}
        <PrimaryButton label={busy ? 'Creando…' : 'Crear sala'} disabled={busy} onClick={handleCreate} />
        <SecondaryButton label="Volver" onClick={() => setView('choose')} />
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
      <Title>Tutti frutti futbolero</Title>
      {errorMsg && <ErrorText text={errorMsg} />}
      <PrimaryButton label="Crear sala" onClick={() => setView('config')} />
      <SecondaryButton label="Unirse con código" onClick={() => setView('join')} />
      <SecondaryButton label="Volver" onClick={onBack} />
    </CenteredCard>
  );
}

function CenteredCard({ children, wide }: { children: ReactNode; wide?: boolean }) {
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
          background: 'rgba(12,12,14,0.9)',
          borderTop: `3px solid ${colors.accent}`,
          borderLeft: '1px solid rgba(255,255,255,0.12)',
          borderRight: '1px solid rgba(255,255,255,0.12)',
          borderBottom: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 0 60px rgba(0,0,0,0.5)',
          maxWidth: wide ? 1100 : 640,
          width: '100%',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        alignSelf: 'flex-start',
        fontSize: 12,
        fontWeight: 800,
        color: colors.accentLight,
        textTransform: 'uppercase',
        letterSpacing: 1,
        borderTop: '1px solid rgba(255,255,255,0.12)',
        width: '100%',
        paddingTop: 18,
        marginTop: -2,
      }}
    >
      {children}
    </div>
  );
}

function PillGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: number[];
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
      <span style={{ fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
      <div style={{ display: 'flex', gap: 6 }}>
        {options.map((opt) => {
          const isSelected = opt === value;
          return (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              style={{
                width: 42,
                height: 42,
                background: isSelected ? colors.accent : 'rgba(18,18,20,0.7)',
                border: `1px solid ${isSelected ? colors.accent : 'rgba(255,255,255,0.2)'}`,
                color: '#fff',
                fontFamily: fonts.display,
                fontSize: 16,
                cursor: 'pointer',
              }}
            >
              {opt}
            </button>
          );
        })}
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
        background: 'rgba(18,18,20,0.8)',
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
  return <div style={{ color: '#e05a5a', fontSize: 14 }}>{text}</div>;
}
