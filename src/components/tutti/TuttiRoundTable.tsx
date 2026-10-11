import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { colors, fonts } from '../../theme';
import type { TuttiSessionRow, TuttiPlayerRow, TuttiAnswerRow, TuttiVerdict } from '../../lib/tuttiSession';
import {
  categoriesForSession,
  submitTuttiAnswer,
  hitTuttiBasta,
  startTuttiVoting,
  castTuttiVerdict,
  finalizeTuttiVoting,
} from '../../lib/tuttiSession';
import { validateTuttiAnswer, type TuttiValidation } from '../../lib/tuttiValidation';

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
  const [hints, setHints] = useState<Record<string, TuttiValidation>>({});
  const hintsRoundRef = useRef<number | null>(null);

  const isHost = session.host_id === userId;
  const voting = session.status === 'round_voting';

  // Scoped to the current round only — tutti_answers keeps one row per
  // (round, player, category), so without this filter a lookup by category
  // key alone could resolve to a stale row from an earlier round instead
  // of the current one (that's what made round 2+ show round 1's answers).
  const myAnswers = useMemo(() => {
    const map: Record<string, TuttiAnswerRow> = {};
    answers.forEach((a) => {
      if (a.player_id === userId && a.round === session.current_round) map[a.category_key] = a;
    });
    return map;
  }, [answers, userId, session.current_round]);

  // Groups this round's answers by category + normalized text, so voters
  // get a "coincide con ..." hint instead of having to eyeball duplicates
  // across rows themselves — purely a UX aid, the vote is still what counts.
  const duplicateGroups = useMemo(() => {
    const groups = new Map<string, TuttiAnswerRow[]>();
    for (const a of answers) {
      if (a.round !== session.current_round) continue;
      const text = a.answer.trim().toLowerCase();
      if (!text) continue;
      const key = `${a.category_key}|${text}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(a);
    }
    return groups;
  }, [answers, session.current_round]);

  useEffect(() => {
    setDraft(Object.fromEntries(categories.map((c) => [c.key, myAnswers[c.key]?.answer ?? ''])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.current_round]);

  // Grace countdown, ticking from whoever hit "Basta". Any client can end
  // up opening voting — startTuttiVoting guards against doing it twice.
  useEffect(() => {
    if (session.status !== 'round_grace' || !session.basta_at) return;
    const bastaAt = new Date(session.basta_at).getTime();

    const interval = setInterval(() => {
      const left = Math.max(0, GRACE_SECONDS - Math.floor((Date.now() - bastaAt) / 1000));
      setGraceLeft(left);
      if (left === 0) {
        clearInterval(interval);
        startTuttiVoting(session).catch((err) => setErrorMsg(err instanceof Error ? err.message : 'Algo salió mal.'));
      }
    }, 250);
    return () => clearInterval(interval);
  }, [session]);

  // Fetches a non-binding "parece real" hint for every non-blank answer
  // once voting opens for this round. Guarded by a ref (not state) so
  // live updates from casting votes — which also touch `answers` — don't
  // re-trigger it; the answer text itself can't change anymore by then.
  useEffect(() => {
    if (!voting) return;
    if (hintsRoundRef.current === session.current_round) return;
    hintsRoundRef.current = session.current_round;

    const letter = session.current_letter ?? '';
    const roundAnswers = answers.filter((a) => a.round === session.current_round && a.answer.trim());

    (async () => {
      const results = await Promise.all(
        roundAnswers.map(async (a) => {
          const category = categories.find((c) => c.key === a.category_key);
          if (!category) return null;
          try {
            const result = await validateTuttiAnswer(category.rule, letter, a.answer);
            return [a.id, result] as const;
          } catch {
            return null;
          }
        })
      );
      setHints((prev) => {
        const next = { ...prev };
        for (const r of results) if (r) next[r[0]] = r[1];
        return next;
      });
    })();
  }, [voting, session.current_round, session.current_letter, answers, categories]);

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

  async function handleBasta() {
    try {
      // Flush any not-yet-blurred field before cutting the round.
      await Promise.all(categories.map((c) => submitTuttiAnswer(session, c.key, draft[c.key] ?? '')));
      await hitTuttiBasta(session);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo mandar Basta.');
    }
  }

  async function handleVerdict(answerId: string, verdict: TuttiVerdict) {
    try {
      await castTuttiVerdict(answerId, verdict);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo registrar el voto.');
    }
  }

  async function handleCloseVoting() {
    try {
      await finalizeTuttiVoting(session);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo cerrar la votación.');
    }
  }

  function playerLabel(playerId: string): string {
    return players.find((p) => p.player_id === playerId)?.nickname ?? '—';
  }

  function resultLabel(row: TuttiAnswerRow | undefined): string {
    if (!row) return '—';
    if (row.is_valid) return `✓ +${row.points}`;
    switch (row.invalid_reason) {
      case 'empty':
        return 'Vacío';
      case 'wrong_letter':
        return `No empieza con ${session.current_letter}`;
      case 'not_found':
        return 'No existe';
      case 'voted_invalid':
        return '✗ votado inválido';
      default:
        return '✗ 0';
    }
  }

  function verdictFromRow(row: TuttiAnswerRow | undefined): TuttiVerdict | null {
    if (!row || row.is_valid === null) return null;
    if (!row.is_valid) return 'invalid';
    return row.points === 5 ? 'duplicate_valid' : 'unique_valid';
  }

  // How many categories each player has at least typed something into for
  // this round — a live "who's still working" readout while the round is
  // active, since the table itself hides everyone else's answers until it
  // ends.
  const submittedCount = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const player of players) {
      counts[player.player_id] = answers.filter(
        (a) => a.player_id === player.player_id && a.round === session.current_round && a.answer.trim()
      ).length;
    }
    return counts;
  }, [answers, players, session.current_round]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%', maxWidth: 1100 }}>
      {session.status === 'round_active' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ fontSize: 14, color: colors.accentLight, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Completá todas las categorías
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: 12, color: colors.textMuted }}>
            {players.map((p) => (
              <span key={p.id}>
                {p.nickname}: {submittedCount[p.player_id] ?? 0}/{categories.length}
              </span>
            ))}
          </div>
        </div>
      )}
      {session.status === 'round_grace' && (
        <div style={{ fontSize: 14, color: '#e0c15a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          ¡Basta de {playerLabel(session.basta_player_id ?? '')}! Se corta en {graceLeft}s
        </div>
      )}
      {voting && (
        <div style={{ fontSize: 14, color: '#e0c15a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Voten cada respuesta — único = 10, repetida = 5, inválida = 0
        </div>
      )}
      {(session.status === 'round_results' || session.status === 'finished') && (
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
                    const row = isMe
                      ? myAnswers[c.key]
                      : answers.find(
                          (a) => a.player_id === player.player_id && a.category_key === c.key && a.round === session.current_round
                        );

                    if (session.status === 'round_active') {
                      if (isMe) {
                        return (
                          <td key={c.key} style={bodyCellStyle}>
                            <input
                              value={draft[c.key] ?? ''}
                              onChange={(e) => handleAnswerChange(c.key, e.target.value)}
                              onBlur={() => handleAnswerBlur(c.key)}
                              placeholder={session.current_letter ?? ''}
                              style={inputStyle}
                            />
                          </td>
                        );
                      }
                      return (
                        <td key={c.key} style={bodyCellStyle}>
                          <span style={{ color: colors.textMuted }}>{row?.answer ? '●●●' : '…'}</span>
                        </td>
                      );
                    }

                    if (voting) {
                      const blank = !row || !row.answer.trim();
                      if (blank) {
                        return (
                          <td key={c.key} style={bodyCellStyle}>
                            <span style={{ color: colors.textMuted }}>Vacío</span>
                          </td>
                        );
                      }
                      const hint = hints[row.id];
                      const dupGroup = duplicateGroups.get(`${c.key}|${row.answer.trim().toLowerCase()}`) ?? [];
                      const others = dupGroup.filter((d) => d.player_id !== player.player_id).map((d) => playerLabel(d.player_id));
                      const active = verdictFromRow(row);
                      return (
                        <td key={c.key} style={bodyCellStyle}>
                          <div style={{ fontWeight: 700, color: '#fff', textTransform: 'uppercase', fontSize: 13 }}>{row.answer}</div>
                          {hint && (
                            <div style={{ fontSize: 10, color: hint.valid ? colors.accentLight : colors.textMuted, marginTop: 2 }}>
                              {hint.valid ? '💡 parece real' : '💡 no se encontró'}
                            </div>
                          )}
                          {others.length > 0 && (
                            <div style={{ fontSize: 10, color: '#e0c15a', marginTop: 2 }}>coincide con {others.join(', ')}</div>
                          )}
                          <VerdictButtons active={active} onPick={(v) => handleVerdict(row.id, v)} />
                        </td>
                      );
                    }

                    // round_results / finished
                    return (
                      <td key={c.key} style={bodyCellStyle}>
                        <span
                          style={{
                            color: row?.is_valid ? colors.accentLight : row?.invalid_reason === 'empty' ? colors.textMuted : '#e05a5a',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                          }}
                        >
                          {row?.answer || '—'}
                        </span>
                        {row && <div style={{ fontSize: 11, color: colors.textMuted }}>{resultLabel(row)}</div>}
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
        <button onClick={handleBasta} style={bastaButtonStyle}>
          ¡Basta!
        </button>
      )}

      {voting && isHost && (
        <button onClick={handleCloseVoting} style={bastaButtonStyle}>
          Cerrar votación
        </button>
      )}
      {voting && !isHost && (
        <div style={{ fontSize: 12, color: colors.textMuted }}>
          Esperando a que {playerLabel(session.host_id)} cierre la votación…
        </div>
      )}

      {errorMsg && <div style={{ color: '#e05a5a', fontSize: 13 }}>{errorMsg}</div>}
    </div>
  );
}

function VerdictButtons({ active, onPick }: { active: TuttiVerdict | null; onPick: (verdict: TuttiVerdict) => void }) {
  const options: { verdict: TuttiVerdict; label: string; title: string }[] = [
    { verdict: 'unique_valid', label: '10', title: 'Única y correcta' },
    { verdict: 'duplicate_valid', label: '5', title: 'Correcta pero repetida' },
    { verdict: 'invalid', label: '✗', title: 'Inválida' },
  ];
  return (
    <div style={{ display: 'flex', gap: 4, marginTop: 6, justifyContent: 'center' }}>
      {options.map((o) => (
        <button
          key={o.verdict}
          title={o.title}
          onClick={() => onPick(o.verdict)}
          style={{
            padding: '3px 8px',
            fontSize: 11,
            fontWeight: 800,
            border: `1px solid ${active === o.verdict ? colors.accentLight : 'rgba(255,255,255,0.2)'}`,
            background: active === o.verdict ? colors.accent : 'transparent',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          {o.label}
        </button>
      ))}
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

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '6px 4px',
  background: 'transparent',
  border: 'none',
  borderBottom: '2px solid rgba(255,255,255,0.2)',
  color: '#fff',
  fontSize: 13,
  fontWeight: 700,
  textAlign: 'center',
  textTransform: 'uppercase',
};

const bastaButtonStyle: CSSProperties = {
  padding: '14px 40px',
  background: colors.accent,
  border: 'none',
  color: '#fff',
  fontWeight: 800,
  fontSize: 16,
  letterSpacing: 1,
  textTransform: 'uppercase',
  cursor: 'pointer',
};
