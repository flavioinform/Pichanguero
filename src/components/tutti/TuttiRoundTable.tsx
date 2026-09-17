import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { colors, fonts } from '../../theme';
import type { TuttiSessionRow, TuttiPlayerRow, TuttiAnswerRow } from '../../lib/tuttiSession';
import { categoriesForSession, submitTuttiAnswer, hitTuttiBasta, finalizeTuttiRound } from '../../lib/tuttiSession';

const GRACE_SECONDS = 6;

interface TuttiRoundTableProps {
  session: TuttiSessionRow;
  players: TuttiPlayerRow[];
  answers: TuttiAnswerRow[];
  userId: string;
}

export function TuttiRoundTable({ session, players, answers, userId }: TuttiRoundTableProps) {
  const categories = useMemo(() => categoriesForSession(session), [session]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [graceLeft, setGraceLeft] = useState(GRACE_SECONDS);

  const revealed = session.status === 'round_results' || session.status === 'finished';

  const myAnswers = useMemo(() => {
    const map: Record<string, TuttiAnswerRow> = {};
    answers.forEach((a) => {
      if (a.player_id === userId) map[a.category_key] = a;
    });
    return map;
  }, [answers, userId]);

  useEffect(() => {
    setDraft(Object.fromEntries(categories.map((c) => [c.key, myAnswers[c.key]?.answer ?? ''])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.current_round]);

  // Grace countdown, ticking from whoever hit "Basta". Any client can end
  // up finalizing — finalizeTuttiRound guards against doing it twice.
  useEffect(() => {
    if (session.status !== 'round_grace' || !session.basta_at) return;
    const bastaAt = new Date(session.basta_at).getTime();

    const interval = setInterval(() => {
      const left = Math.max(0, GRACE_SECONDS - Math.floor((Date.now() - bastaAt) / 1000));
      setGraceLeft(left);
      if (left === 0) {
        clearInterval(interval);
        finalizeTuttiRound(session).catch((err) => setErrorMsg(err instanceof Error ? err.message : 'Algo salió mal.'));
      }
    }, 250);
    return () => clearInterval(interval);
  }, [session]);

  function handleAnswerChange(categoryKey: string, value: string) {
    setDraft((prev) => ({ ...prev, [categoryKey]: value }));
  }

  async function handleAnswerBlur(categoryKey: string) {
    if (session.status !== 'round_active') return;
    try {
      await submitTuttiAnswer(session, categoryKey, draft[categoryKey] ?? '');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo guardar la respuesta.');
    }
  }

  const allFilled = categories.every((c) => (draft[c.key] ?? '').trim().length > 0);

  async function handleBasta() {
    try {
      // Flush any not-yet-blurred field before cutting the round.
      await Promise.all(categories.map((c) => submitTuttiAnswer(session, c.key, draft[c.key] ?? '')));
      await hitTuttiBasta(session);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo mandar Basta.');
    }
  }

  function playerLabel(playerId: string): string {
    return players.find((p) => p.player_id === playerId)?.nickname ?? '—';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%', maxWidth: 1100 }}>
      {session.status === 'round_active' && (
        <div style={{ fontSize: 14, color: colors.accentLight, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Completá todas las categorías
        </div>
      )}
      {session.status === 'round_grace' && (
        <div style={{ fontSize: 14, color: '#e0c15a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          ¡Basta de {playerLabel(session.basta_player_id ?? '')}! Se corta en {graceLeft}s
        </div>
      )}
      {revealed && (
        <div style={{ fontSize: 14, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Resultados de la ronda
        </div>
      )}

      <div style={{ width: '100%', overflowX: 'auto', border: `1px solid ${colors.accent}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ ...cornerCellStyle }}>
                <div style={{ fontSize: 10, color: colors.textMuted, fontWeight: 700 }}>
                  RONDA {session.current_round}
                </div>
                <div style={{ fontFamily: fonts.display, fontSize: 30, color: colors.accentLight }}>
                  {session.current_letter}
                </div>
              </th>
              {categories.map((c) => (
                <th key={c.key} style={headCellStyle}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {players.map((player) => {
              const isMe = player.player_id === userId;
              return (
                <tr key={player.id}>
                  <td style={playerCellStyle}>{player.nickname}</td>
                  {categories.map((c) => {
                    if (isMe) {
                      const myRow = myAnswers[c.key];
                      return (
                        <td key={c.key} style={bodyCellStyle}>
                          <input
                            value={draft[c.key] ?? ''}
                            onChange={(e) => handleAnswerChange(c.key, e.target.value)}
                            onBlur={() => handleAnswerBlur(c.key)}
                            disabled={session.status !== 'round_active'}
                            placeholder={session.current_letter ?? ''}
                            style={{
                              width: '100%',
                              padding: '6px 4px',
                              background: 'transparent',
                              border: 'none',
                              borderBottom: `2px solid ${revealed ? (myRow?.is_valid ? 'rgba(47,174,76,0.6)' : 'rgba(224,90,90,0.5)') : 'rgba(255,255,255,0.2)'}`,
                              color: '#fff',
                              fontSize: 13,
                              fontWeight: 700,
                              textAlign: 'center',
                              textTransform: 'uppercase',
                            }}
                          />
                          {revealed && (
                            <div style={{ fontSize: 11, color: myRow?.is_valid ? colors.accentLight : '#e05a5a', marginTop: 3 }}>
                              {myRow?.is_valid ? `✓ +${myRow.points}` : '✗ 0'}
                            </div>
                          )}
                        </td>
                      );
                    }

                    const theirRow = answers.find((a) => a.player_id === player.player_id && a.category_key === c.key);
                    return (
                      <td key={c.key} style={bodyCellStyle}>
                        {revealed ? (
                          <>
                            <span style={{ color: theirRow?.is_valid ? colors.accentLight : '#e05a5a', fontWeight: 700, textTransform: 'uppercase' }}>
                              {theirRow?.answer || '—'}
                            </span>
                            {theirRow && (
                              <div style={{ fontSize: 11, color: colors.textMuted }}>
                                {theirRow.is_valid ? `✓ +${theirRow.points}` : '✗ 0'}
                              </div>
                            )}
                          </>
                        ) : (
                          <span style={{ color: colors.textMuted }}>{theirRow?.answer ? '●●●' : '…'}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {session.status === 'round_active' && (
        <button
          onClick={handleBasta}
          disabled={!allFilled}
          style={{
            padding: '14px 40px',
            background: allFilled ? colors.accent : 'rgba(47,174,76,0.25)',
            border: 'none',
            color: '#fff',
            fontWeight: 800,
            fontSize: 16,
            letterSpacing: 1,
            textTransform: 'uppercase',
            cursor: allFilled ? 'pointer' : 'default',
          }}
        >
          ¡Basta!
        </button>
      )}

      {errorMsg && <div style={{ color: '#e05a5a', fontSize: 13 }}>{errorMsg}</div>}
    </div>
  );
}

const GRID_LINE = '1px solid rgba(255,255,255,0.15)';

const cornerCellStyle: CSSProperties = {
  padding: '10px 14px',
  border: GRID_LINE,
  background: 'rgba(47,174,76,0.1)',
  textAlign: 'center',
  verticalAlign: 'middle',
};

const headCellStyle: CSSProperties = {
  padding: '10px 8px',
  fontSize: 11,
  fontWeight: 800,
  color: colors.textSecondary,
  textTransform: 'uppercase',
  letterSpacing: 0.3,
  border: GRID_LINE,
  background: 'rgba(255,255,255,0.03)',
  textAlign: 'center',
};

const playerCellStyle: CSSProperties = {
  padding: '14px 16px',
  fontSize: 14,
  fontWeight: 800,
  color: '#fff',
  textTransform: 'uppercase',
  border: GRID_LINE,
  background: 'rgba(255,255,255,0.03)',
  textAlign: 'left',
};

const bodyCellStyle: CSSProperties = {
  padding: '10px 10px',
  fontSize: 13,
  border: GRID_LINE,
  verticalAlign: 'middle',
  textAlign: 'center',
};
