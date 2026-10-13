import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { colors, fonts } from '../../theme';
import { BackArrowIcon } from '../../icons/BackArrowIcon';
import { useAuth } from '../../hooks/useAuth';
import { usePasapalabraSession } from '../../hooks/usePasapalabraSession';
import { decodeStatuses, entryById, loadBest, pickRosco, saveBest, type LetterStatus, type RoscoEntry } from '../../lib/pasapalabra';
import {
  createPasapalabraSession,
  endTurn,
  expireTurn,
  getUsedQuestionIds,
  joinPasapalabraSession,
  markQuestionsUsed,
  saveProgress,
  startPasapalabra,
  type PasapalabraPlayerRow,
  type PasapalabraSessionRow,
} from '../../lib/pasapalabraSession';
import { PasapalabraGame } from './PasapalabraGame';
import { Rosco } from './Rosco';
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
        <p style={paragraphStyle}>Creá una sala y pasale el código a tu rival. Juegan el mismo rosco por turnos: si decís pasapalabra o fallás, le toca al otro. Cada uno tiene su propio reloj, que solo corre en su turno.</p>
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
  const [now, setNow] = useState(() => Date.now());
  const expiredTurn = useRef<string | null>(null);
  const markedUsed = useRef(false);

  const playing = session?.status === 'playing';
  const me = players.find((p) => p.player_id === userId);
  const turnPlayer = session ? players.find((p) => p.player_id === session.turn_player_id) : undefined;

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [playing]);

  // Whoever is in the room can close a turn whose clock ran out, so a player
  // who left can't freeze the match. The server only acts if time is really up.
  useEffect(() => {
    if (!session || !playing || !turnPlayer || !session.turn_started_at) return;
    const deadline = Date.parse(session.turn_started_at) + turnPlayer.time_left_ms + PASAPALABRA.expireGraceMs;
    if (now < deadline || expiredTurn.current === session.turn_started_at) return;
    const turnKey = session.turn_started_at;
    expiredTurn.current = turnKey;
    expireTurn(sessionId).catch(() => {
      setTimeout(() => {
        if (expiredTurn.current === turnKey) expiredTurn.current = null;
      }, 3000);
    });
  }, [session, playing, turnPlayer, now, sessionId]);

  // Once this player's rosco is done, remember the clues so they don't repeat.
  const myRoscoDone = Boolean(me?.finished_at) || session?.status === 'finished';
  useEffect(() => {
    if (!session || !myRoscoDone || markedUsed.current || session.question_ids.length === 0) return;
    markedUsed.current = true;
    markQuestionsUsed(session.question_ids).catch(() => undefined);
  }, [session, myRoscoDone]);

  if (loading || !session) return <Card><div style={{ color: colors.textSecondary }}>Cargando sala…</div></Card>;

  const isHost = session.host_id === userId;

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

  if (session.status === 'finished') {
    return <OnlineResults players={players} onMenu={onMenu} />;
  }

  const ring = session.question_ids.map((id) => entryById(id)).filter((e): e is RoscoEntry => Boolean(e));
  const turnStartedMs = session.turn_started_at ? Date.parse(session.turn_started_at) : now;
  const panel = (
    <RivalsPanel
      players={players}
      selfId={userId}
      totalLetters={ring.length}
      turnPlayerId={session.turn_player_id}
      turnStartedMs={turnStartedMs}
      now={now}
    />
  );

  if (session.turn_player_id === userId && me) {
    return (
      <PasapalabraGame
        key={session.turn_started_at ?? 'turn'}
        entries={ring}
        endsAt={turnStartedMs + me.time_left_ms}
        totalSeconds={session.duration_seconds}
        duel={{
          initialStatuses: decodeStatuses(me.statuses, ring.length),
          initialCurrent: Math.min(me.current_index, ring.length - 1),
          onCorrect: (statuses, score, nextIndex) => {
            saveProgress(sessionId, statuses, score, nextIndex).catch(() => undefined);
          },
          onEndTurn: (statuses, score, nextIndex, finished) => {
            endTurn(sessionId, statuses, score, nextIndex, finished).catch((err) =>
              setErrorMsg(err instanceof Error ? err.message : 'No se pudo pasar el turno.')
            );
          },
        }}
        aside={
          <>
            {panel}
            {errorMsg && <div style={{ color: colors.danger, fontSize: 13 }}>{errorMsg}</div>}
          </>
        }
      />
    );
  }

  return (
    <WatchingTurn
      session={session}
      ring={ring}
      turnPlayer={turnPlayer}
      meFinished={Boolean(me?.finished_at)}
      turnStartedMs={turnStartedMs}
      now={now}
      panel={panel}
    />
  );
}

/** What everyone else sees while it's not their turn: the active player's
 * rosco filling in live, with their clock running. */
function WatchingTurn({
  session,
  ring,
  turnPlayer,
  meFinished,
  turnStartedMs,
  now,
  panel,
}: {
  session: PasapalabraSessionRow;
  ring: RoscoEntry[];
  turnPlayer: PasapalabraPlayerRow | undefined;
  meFinished: boolean;
  turnStartedMs: number;
  now: number;
  panel: ReactNode;
}) {
  if (!turnPlayer) return <Card><div style={{ color: colors.textSecondary }}>Esperando el próximo turno…</div></Card>;
  const statuses = decodeStatuses(turnPlayer.statuses, ring.length);
  const secondsLeft = Math.max(0, Math.ceil((turnStartedMs + turnPlayer.time_left_ms - now) / 1000));
  const current = Math.min(turnPlayer.current_index, ring.length - 1);

  return (
    <div style={{ display: 'flex', gap: 48, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
      <div style={{ width: 'min(420px, 90vw)', flexShrink: 0 }}>
        <Rosco
          letters={ring.map((e) => e.letter)}
          statuses={statuses}
          current={current}
          secondsLeft={secondsLeft}
          totalSeconds={session.duration_seconds}
          correct={statuses.filter((s) => s === 'correct').length}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: 360, maxWidth: '90vw' }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: colors.warning, textTransform: 'uppercase', letterSpacing: 1 }}>
          Turno de {turnPlayer.nickname}
        </div>
        <div style={{ fontFamily: fonts.display, fontSize: 30, color: '#fff', textTransform: 'uppercase' }}>
          Con la {ring[current]?.letter}
        </div>
        <div style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 1.5 }}>
          {meFinished
            ? 'Ya terminaste tu rosco. Esperá a que terminen los demás.'
            : 'Esperá: cuando diga pasapalabra o falle, te toca a vos.'}
        </div>
        {panel}
      </div>
    </div>
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

function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function RivalsPanel({
  players,
  selfId,
  totalLetters,
  turnPlayerId,
  turnStartedMs,
  now,
}: {
  players: PasapalabraPlayerRow[];
  selfId: string;
  totalLetters: number;
  turnPlayerId: string | null;
  turnStartedMs: number;
  now: number;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
      <div style={{ fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>En vivo</div>
      {players.map((p) => {
        const statuses = decodeStatuses(p.statuses, totalLetters);
        const done = statuses.filter((s) => s !== 'pending').length;
        const active = p.player_id === turnPlayerId;
        const bankMs = active ? p.time_left_ms - (now - turnStartedMs) : p.time_left_ms;
        return (
          <div
            key={p.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              padding: '4px 6px',
              border: `1px solid ${active ? colors.warning : 'transparent'}`,
              opacity: p.finished_at ? 0.6 : 1,
            }}
          >
            <span style={{ color: p.player_id === selfId ? colors.accentLight : '#fff', fontWeight: 700, minWidth: 90 }}>
              {active ? '▶ ' : ''}
              {p.nickname}
            </span>
            <span style={{ display: 'flex', gap: 2, flexWrap: 'wrap', maxWidth: 170 }}>
              {statuses.map((s, i) => (
                <span
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: s === 'correct' ? colors.accent : s === 'wrong' ? colors.danger : 'rgba(255,255,255,0.2)',
                  }}
                />
              ))}
            </span>
            <span style={{ color: colors.textMuted, fontSize: 12, whiteSpace: 'nowrap' }}>
              {p.score} ({done}/{totalLetters})
            </span>
            <span
              style={{
                color: bankMs <= 20000 ? colors.danger : colors.textSecondary,
                fontSize: 12,
                marginLeft: 'auto',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {p.finished_at ? 'fin' : formatClock(bankMs)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function OnlineResults({ players, onMenu }: { players: PasapalabraPlayerRow[]; onMenu: () => void }) {
  // Most letters right wins; a tie goes to whoever has more time left.
  const ranked = [...players].sort((a, b) => b.score - a.score || b.time_left_ms - a.time_left_ms);
  return (
    <Card>
      <Title>Resultado</Title>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 'min(280px, 100%)' }}>
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
            <span>
              {p.score} / {TOTAL}
            </span>
          </div>
        ))}
      </div>
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
        padding: '32px clamp(18px, 5vw, 44px)',
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
  return <h2 style={{ fontFamily: fonts.display, fontSize: 'clamp(24px, 7vw, 32px)', margin: 0, color: '#fff', textTransform: 'uppercase' }}>{children}</h2>;
}

function TextInput({ value, onChange, placeholder, onEnter }: { value: string; onChange: (v: string) => void; placeholder: string; onEnter: () => void }) {
  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && onEnter()}
      placeholder={placeholder}
      style={{ padding: '12px 16px', fontSize: 16, background: colors.surfaceRaised, border: `1px solid ${colors.accent}`, color: '#fff', fontFamily: fonts.body, minWidth: 'min(260px, 100%)', maxWidth: '100%', textAlign: 'center' }}
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
