import { useState } from 'react';
import type { ReactNode } from 'react';
import { colors, fonts } from '../../theme';
import { useAuth } from '../../hooks/useAuth';
import { useGameSession } from '../../hooks/useGameSession';
import { createGatoSession, joinGatoSession, submitGatoTurn, type GatoSessionRow } from '../../lib/gatoSession';
import type { Difficulty } from '../../lib/gatoGrid';
import { GatoBoard, type BoardTurn } from './GatoBoard';
import { DifficultySelect } from './DifficultySelect';

interface GatoOnlineScreenProps {
  onBack: () => void;
}

type View = 'nickname' | 'choose' | 'difficulty' | 'join' | 'waiting';

function nicknameFor(session: GatoSessionRow, playerId: string): string {
  if (playerId === session.player_a) return session.player_a_nickname ?? 'Jugador A';
  if (playerId === session.player_b) return session.player_b_nickname ?? 'Jugador B';
  return '—';
}

export function GatoOnlineScreen({ onBack }: GatoOnlineScreenProps) {
  const { userId, nickname, loading: authLoading, setNickname } = useAuth();
  const [view, setView] = useState<View>('choose');
  const [nicknameInput, setNicknameInput] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { session, turns, loading: sessionLoading } = useGameSession(sessionId);

  if (authLoading) {
    return <CenteredMessage text="Conectando…" />;
  }

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
        <PrimaryButton
          label="Continuar"
          disabled={!nicknameInput.trim()}
          onClick={() => setNickname(nicknameInput.trim())}
        />
      </CenteredCard>
    );
  }

  async function handleCreate(difficulty: Difficulty) {
    setBusy(true);
    setErrorMsg(null);
    try {
      const created = await createGatoSession(nickname!, difficulty);
      setSessionId(created.id);
      setView('waiting');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo crear la partida.');
      setView('choose');
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin() {
    if (!joinCodeInput.trim()) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      const joined = await joinGatoSession(joinCodeInput.trim(), nickname!);
      setSessionId(joined.id);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo unir a la partida.');
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
    return <CenteredMessage text="Cargando partida…" />;
  }

  if (session && userId && (session.status === 'active' || session.status === 'finished')) {
    const opponentId = session.player_a === userId ? session.player_b : session.player_a;
    const boardTurns: BoardTurn[] = turns.map((t) => ({
      rowIndex: t.row_index,
      colIndex: t.col_index,
      playerId: t.player_id,
      answer: t.answer,
      isCorrect: Boolean(t.is_correct),
    }));

    return (
      <GatoBoard
        rowCriteria={session.row_criteria}
        colCriteria={session.col_criteria}
        turns={boardTurns}
        scores={session.scores}
        me={{ id: userId, label: nicknameFor(session, userId) }}
        opponent={{ id: opponentId ?? 'opponent', label: opponentId ? nicknameFor(session, opponentId) : 'Rival' }}
        currentTurnPlayerId={session.status === 'finished' ? null : session.current_turn}
        finished={session.status === 'finished'}
        onSubmitAnswer={(row, col, answer) => submitGatoTurn(session, row, col, answer)}
        onExit={onBack}
        onPlayAgain={handlePlayAgain}
      />
    );
  }

  if (view === 'difficulty') {
    if (busy) return <CenteredMessage text="Creando partida…" />;
    return <DifficultySelect onSelect={handleCreate} onBack={() => setView('choose')} />;
  }

  if (view === 'waiting' && session) {
    return (
      <CenteredCard>
        <Title>Esperando rival…</Title>
        <p style={{ color: colors.textSecondary, fontSize: 15, margin: 0, textAlign: 'center' }}>
          Compartile este código a tu rival para que se una:
        </p>
        <div
          style={{
            fontFamily: fonts.display,
            fontSize: 40,
            letterSpacing: 4,
            color: colors.accentLight,
            border: `2px solid ${colors.accent}`,
            padding: '12px 28px',
          }}
        >
          {session.join_code}
        </div>
      </CenteredCard>
    );
  }

  if (view === 'join') {
    return (
      <CenteredCard>
        <Title>Unirse a partida</Title>
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
      <Title>Gato futbolero</Title>
      {errorMsg && <ErrorText text={errorMsg} />}
      <PrimaryButton label="Crear partida" onClick={() => setView('difficulty')} />
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
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
      }}
    >
      {children}
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
    <h1
      style={{
        fontFamily: fonts.display,
        fontSize: 40,
        margin: 0,
        color: '#fff',
        textTransform: 'uppercase',
      }}
    >
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
