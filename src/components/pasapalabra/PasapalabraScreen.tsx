import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { colors, fonts } from '../../theme';
import { BackArrowIcon } from '../../icons/BackArrowIcon';
import { useAuth } from '../../hooks/useAuth';
import { usePasapalabraSession } from '../../hooks/usePasapalabraSession';
import { decodeStatuses, entryById, loadBest, pickRosco, saveBest, type LetterStatus, type RoscoEntry } from '../../lib/pasapalabra';
import {
  createPasapalabraSession,
  finishPlayer,
  getUsedQuestionIds,
  joinPasapalabraSession,
  markQuestionsUsed,
  saveProgress,
  startPasapalabra,
  type PasapalabraPlayerRow,
} from '../../lib/pasapalabraSession';
import { PasapalabraGame } from './PasapalabraGame';
import { PASAPALABRA } from '../../config/gameConfig';
import { LETTERS } from '../../data/pasapalabraBank';

interface PasapalabraScreenProps {
  onBack: () => void;
}

type View = 'menu' | 'solo' | 'online-menu' | 'online-join';

interface SoloResult {
  score: number;
  timeUp: boolean;
}

const TOTAL = LETTERS.length;

export function PasapalabraScreen({ onBack }: PasapalabraScreenProps) {
  const [view, setView] = useState<View>('menu');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [soloEntries, setSoloEntries] = useState<RoscoEntry[] | null>(null);
  const [soloResult, setSoloResult] = useState<SoloResult | null>(null);
  const [soloEndsAt, setSoloEndsAt] = useState(0);
  const [best, setBest] = useState<number>(loadBest);

  if (view === 'solo') {
    return (
      <Shell onBack={onBack}>
        <SoloGame
          entries={soloEntries}
          endsAt={soloEndsAt}
          result={soloResult}
          best={best}
          onStart={async () => {
            setBusy(true);
            setErrorMsg(null);
            try {
              const used = await getUsedQuestionIds();
              setSoloEntries(pickRosco(used));
              setSoloEndsAt(Date.now() + PASAPALABRA.roundSeconds * 1000);
              setSoloResult(null);
            } catch (err) {
              setErrorMsg(err instanceof Error ? err.message : 'No se pudo armar el rosco.');
            } finally {
              setBusy(false);
            }
          }}
          onFinish={async (entries, statuses, timeUp) => {
            const score = statuses.filter((s) => s === 'correct').length;
            if (score > best) {
              saveBest(score);
              setBest(score);
            }
            setSoloResult({ score, timeUp });
            setSoloEntries(null);
            await markQuestionsUsed(entries.map((e) => e.id)).catch(() => undefined);
          }}
          onMenu={() => {
            setSoloEntries(null);
            setSoloResult(null);
            setView('menu');
          }}
          busy={busy}
          errorMsg={errorMsg}
        />
      </Shell>
    );
  }

  if (view === 'online-menu' || view === 'online-join') {
    return <OnlineEntry view={view} setView={setView} onBack={onBack} />;
  }

  return (
    <Shell onBack={onBack}>
      <Card>
        <p style={paragraphStyle}>
          Un rosco de 27 letras contra el reloj. Cada letra tiene una pista: escribí la respuesta, o usá <b>Pasapalabra</b>
          para volver a ella al final. Las preguntas no se repiten hasta que se acaben.
        </p>
        <div style={{ fontSize: 13, color: colors.textMuted }}>Mejor puntaje solo: {best} / {TOTAL}</div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
          <PrimaryButton label="Jugar solo" onClick={() => setView('solo')} />
          <SecondaryButton label="Jugar online" onClick={() => setView('online-menu')} />
        </div>
      </Card>
    </Shell>
  );
}

function SoloGame({
  entries,
  endsAt,
  result,
  best,
  onStart,
  onFinish,
  onMenu,
  busy,
  errorMsg,
}: {
  entries: RoscoEntry[] | null;
  endsAt: number;
  result: SoloResult | null;
  best: number;
  onStart: () => void;
  onFinish: (entries: RoscoEntry[], statuses: LetterStatus[], timeUp: boolean) => void;
  onMenu: () => void;
  busy: boolean;
  errorMsg: string | null;
}) {
  if (result) {
    return (
      <Card>
        <div style={{ fontFamily: fonts.display, fontSize: 34, color: '#fff', textTransform: 'uppercase' }}>
          {result.timeUp ? 'Se acabó el tiempo' : '¡Rosco completo!'}
        </div>
        <div style={{ fontFamily: fonts.display, fontSize: 56, color: colors.accentLight }}>
          {result.score} / {TOTAL}
        </div>
        <div style={{ fontSize: 13, color: colors.textMuted }}>Mejor puntaje solo: {best} / {TOTAL}</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <PrimaryButton label="Jugar de nuevo" onClick={onStart} disabled={busy} />
          <SecondaryButton label="Volver" onClick={onMenu} />
        </div>
      </Card>
    );
  }

  if (!entries) {
    return (
      <Card>
        <p style={paragraphStyle}>Tenés {PASAPALABRA.roundSeconds / 60} minutos para pasar por el rosco.</p>
        {errorMsg && <div style={{ color: colors.danger, fontSize: 13 }}>{errorMsg}</div>}
        <PrimaryButton label={busy ? 'Armando…' : 'Empezar'} disabled={busy} onClick={onStart} />
        <SecondaryButton label="Volver" onClick={onMenu} />
      </Card>
    );
  }

  return (
    <PasapalabraGame
      entries={entries}
      endsAt={endsAt}
      totalSeconds={PASAPALABRA.roundSeconds}
      onFinish={(statuses, _score, timeUp) => onFinish(entries, statuses, timeUp)}
    />
  );
}

function OnlineEntry({
  view,
  setView,
  onBack,
}: {
  view: 'online-menu' | 'online-join';
  setView: (v: View) => void;
  onBack: () => void;
}) {
  const { userId, nickname, loading: authLoading, setNickname } = useAuth();
  const [nicknameInput, setNicknameInput] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (authLoading) return <Shell onBack={onBack}><Card><div style={{ color: colors.textSecondary }}>Conectando…</div></Card></Shell>;

  if (!nickname) {
    return (
      <Shell onBack={onBack}>
        <Card>
          <Title>¿Cómo te llamás?</Title>
          <TextInput value={nicknameInput} onChange={setNicknameInput} placeholder="Tu apodo" onEnter={() => nicknameInput.trim() && setNickname(nicknameInput.trim())} />
          <PrimaryButton label="Continuar" disabled={!nicknameInput.trim()} onClick={() => setNickname(nicknameInput.trim())} />
        </Card>
      </Shell>
    );
  }

  if (sessionId) {
    return (
      <Shell onBack={onBack}>
        <OnlineRoom
          sessionId={sessionId}
          userId={userId ?? ''}
          onLeave={() => {
            setSessionId(null);
            setView('online-menu');
          }}
          onMenu={onBack}
        />
      </Shell>
    );
  }

  async function handleCreate() {
    setBusy(true);
    setErrorMsg(null);
    try {
      const created = await createPasapalabraSession(nickname!, { durationSeconds: PASAPALABRA.roundSeconds });
      setSessionId(created.id);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo crear la sala.');
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin() {
    if (!joinCode.trim()) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      const joined = await joinPasapalabraSession(joinCode.trim(), nickname!);
      setSessionId(joined.id);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo unir a la sala.');
    } finally {
      setBusy(false);
    }
  }

  if (view === 'online-join') {
    return (
      <Shell onBack={onBack}>
        <Card>
          <Title>Unirse a sala</Title>
          <TextInput value={joinCode} onChange={(v) => setJoinCode(v.toUpperCase())} placeholder="Código de 6 letras" onEnter={handleJoin} />
          {errorMsg && <div style={{ color: colors.danger, fontSize: 14 }}>{errorMsg}</div>}
          <PrimaryButton label={busy ? 'Uniendo…' : 'Unirse'} disabled={busy || !joinCode.trim()} onClick={handleJoin} />
          <SecondaryButton label="Volver" onClick={() => setView('online-menu')} />
        </Card>
      </Shell>
    );
  }

  return (
    <Shell onBack={onBack}>
      <Card>
        <Title>Pasapalabra online</Title>
        <p style={paragraphStyle}>Creá una sala y pasale el código a tu rival. Ambos juegan el mismo rosco contra el mismo reloj.</p>
        {errorMsg && <div style={{ color: colors.danger, fontSize: 14 }}>{errorMsg}</div>}
        <PrimaryButton label={busy ? 'Creando…' : 'Crear sala'} disabled={busy} onClick={handleCreate} />
        <SecondaryButton label="Unirse con código" onClick={() => setView('online-join')} />
        <SecondaryButton label="Volver" onClick={() => setView('menu')} />
      </Card>
    </Shell>
  );
}

function OnlineRoom({
  sessionId,
  userId,
  onLeave,
  onMenu,
}: {
  sessionId: string;
  userId: string;
  onLeave: () => void;
  onMenu: () => void;
}) {
  const { session, players, loading } = usePasapalabraSession(sessionId);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [localFinished, setLocalFinished] = useState(false);

  if (loading || !session) return <Card><div style={{ color: colors.textSecondary }}>Cargando sala…</div></Card>;

  const isHost = session.host_id === userId;
  const me = players.find((p) => p.player_id === userId);

  if (session.status === 'waiting') {
    return (
      <Card>
        <Title>Sala de espera</Title>
        <div style={{ fontFamily: fonts.display, fontSize: 36, letterSpacing: 6, color: colors.accentLight, border: `2px solid ${colors.accent}`, padding: '10px 24px' }}>
          {session.join_code}
        </div>
        <RosterList players={players} hostId={session.host_id} />
        {isHost ? (
          <>
            <PrimaryButton
              label={busy ? 'Armando…' : 'Empezar partida'}
              disabled={busy || players.length < 2}
              onClick={async () => {
                setBusy(true);
                setErrorMsg(null);
                try {
                  const used = await getUsedQuestionIds();
                  await startPasapalabra(session, used);
                } catch (err) {
                  setErrorMsg(err instanceof Error ? err.message : 'No se pudo empezar.');
                } finally {
                  setBusy(false);
                }
              }}
            />
            {players.length < 2 && <div style={{ fontSize: 12, color: colors.textMuted }}>Esperando al otro jugador…</div>}
          </>
        ) : (
          <div style={{ color: colors.textSecondary, fontSize: 14 }}>
            Esperando a que {players.find((p) => p.player_id === session.host_id)?.nickname ?? 'el host'} empiece…
          </div>
        )}
        {errorMsg && <div style={{ color: colors.danger, fontSize: 13 }}>{errorMsg}</div>}
        <SecondaryButton label="Salir" onClick={onLeave} />
      </Card>
    );
  }

  const ring = session.question_ids.map((id) => entryById(id)).filter((e): e is RoscoEntry => Boolean(e));
  const endsAt = session.started_at ? Date.parse(session.started_at) + session.duration_seconds * 1000 : 0;
  const everyoneDone = players.length > 0 && players.every((p) => p.finished_at !== null);
  const timeOver = Date.now() >= endsAt;

  if (localFinished || me?.finished_at || everyoneDone || timeOver) {
    return <OnlineResults players={players} onMenu={onMenu} waitingFor={players.filter((p) => !p.finished_at)} />;
  }

  return (
    <PasapalabraGame
      entries={ring}
      endsAt={endsAt}
      totalSeconds={session.duration_seconds}
      onProgress={(statuses, score) => {
        saveProgress(sessionId, statuses, score).catch(() => undefined);
      }}
      onFinish={async (statuses, score) => {
        setLocalFinished(true);
        await finishPlayer(sessionId, statuses, score).catch(() => undefined);
        await markQuestionsUsed(session.question_ids).catch(() => undefined);
      }}
      aside={<RivalsPanel players={players} selfId={userId} totalLetters={ring.length} />}
    />
  );
}

function RosterList({ players, hostId }: { players: PasapalabraPlayerRow[]; hostId: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
      {players.map((p) => (
        <div key={p.id} style={rowStyle}>
          <span>{p.nickname}</span>
          {p.player_id === hostId && <span style={{ color: colors.accentLight, fontSize: 12, textTransform: 'uppercase' }}>Host 👑</span>}
        </div>
      ))}
    </div>
  );
}

function RivalsPanel({ players, selfId, totalLetters }: { players: PasapalabraPlayerRow[]; selfId: string; totalLetters: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
      <div style={{ fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>En vivo</div>
      {players.map((p) => {
        const statuses = decodeStatuses(p.statuses, totalLetters);
        const done = statuses.filter((s) => s !== 'pending').length;
        return (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{ color: p.player_id === selfId ? colors.accentLight : '#fff', fontWeight: 700, minWidth: 90 }}>
              {p.nickname}
            </span>
            <span style={{ display: 'flex', gap: 2, flexWrap: 'wrap', maxWidth: 200 }}>
              {statuses.map((s, i) => (
                <span
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: s === 'correct' ? '#2fae4c' : s === 'wrong' ? colors.danger : 'rgba(255,255,255,0.2)',
                  }}
                />
              ))}
            </span>
            <span style={{ color: colors.textMuted, fontSize: 12 }}>
              {p.score} ({done}/{totalLetters})
            </span>
          </div>
        );
      })}
    </div>
  );
}

function OnlineResults({
  players,
  onMenu,
  waitingFor,
}: {
  players: PasapalabraPlayerRow[];
  onMenu: () => void;
  waitingFor: PasapalabraPlayerRow[];
}) {
  const ranked = [...players].sort((a, b) => b.score - a.score);
  return (
    <Card>
      <Title>Resultado</Title>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 280 }}>
        {ranked.map((p, i) => (
          <div
            key={p.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '10px 16px',
              background: i === 0 && p.score > 0 ? 'rgba(47,174,76,0.18)' : 'rgba(18,18,20,0.5)',
              border: `1px solid ${i === 0 && p.score > 0 ? colors.accent : 'rgba(255,255,255,0.15)'}`,
              color: '#fff',
              fontWeight: i === 0 ? 800 : 500,
            }}
          >
            <span>
              {i === 0 && p.score > 0 ? '🏆 ' : ''}
              {p.nickname}
            </span>
            <span>{p.score} / {TOTAL}</span>
          </div>
        ))}
      </div>
      {waitingFor.length > 0 && (
        <div style={{ fontSize: 12, color: colors.textMuted }}>
          Esperando a {waitingFor.map((p) => p.nickname).join(', ')}…
        </div>
      )}
      <SecondaryButton label="Volver al menú" onClick={onMenu} />
    </Card>
  );
}

function Shell({ onBack, children }: { onBack: () => void; children: ReactNode }) {
  return (
    <div style={rootStyle}>
      <button onClick={onBack} style={exitButtonStyle}>
        <BackArrowIcon />
        SALIR
      </button>
      <h1 style={titleStyle}>Pasapalabra futbolero</h1>
      {children}
    </div>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 18,
        padding: '36px 44px',
        background: colors.surface,
        borderTop: `3px solid ${colors.accent}`,
        borderLeft: '1px solid rgba(255,255,255,0.12)',
        borderRight: '1px solid rgba(255,255,255,0.12)',
        borderBottom: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 0 60px rgba(0,0,0,0.5)',
        maxWidth: 560,
        textAlign: 'center',
      }}
    >
      {children}
    </div>
  );
}

function Title({ children }: { children: ReactNode }) {
  return <h2 style={{ fontFamily: fonts.display, fontSize: 32, margin: 0, color: '#fff', textTransform: 'uppercase' }}>{children}</h2>;
}

function TextInput({ value, onChange, placeholder, onEnter }: { value: string; onChange: (v: string) => void; placeholder: string; onEnter: () => void }) {
  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && onEnter()}
      placeholder={placeholder}
      style={{ padding: '12px 16px', fontSize: 16, background: colors.surfaceRaised, border: `1px solid ${colors.accent}`, color: '#fff', fontFamily: fonts.body, minWidth: 260, textAlign: 'center' }}
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

function SecondaryButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '10px 24px',
        background: 'none',
        border: '1px solid rgba(255,255,255,0.25)',
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: 0.5,
        cursor: disabled ? 'default' : 'pointer',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </button>
  );
}

const paragraphStyle: CSSProperties = { margin: 0, color: colors.textSecondary, fontSize: 15, lineHeight: 1.6, maxWidth: 440 };

const rowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '10px 16px',
  background: 'rgba(18,18,20,0.5)',
  border: '1px solid rgba(255,255,255,0.15)',
  color: '#fff',
  fontSize: 14,
  fontWeight: 600,
};

const rootStyle: CSSProperties = {
  position: 'relative',
  zIndex: 2,
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 28,
  padding: '56px 24px 24px',
  boxSizing: 'border-box',
};

const titleStyle: CSSProperties = {
  fontFamily: fonts.display,
  fontSize: 40,
  margin: 0,
  color: '#fff',
  textTransform: 'uppercase',
  textShadow: '0 2px 18px rgba(0,0,0,0.6)',
};

const exitButtonStyle: CSSProperties = {
  position: 'absolute',
  top: 28,
  left: 40,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  background: 'none',
  border: 'none',
  color: colors.textSecondary,
  fontSize: 14,
  fontWeight: 600,
  letterSpacing: 0.5,
  cursor: 'pointer',
  padding: '6px 0',
};
