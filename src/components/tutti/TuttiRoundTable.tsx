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
import { TUTTI } from '../../config/gameConfig';

interface TuttiRoundTableProps {
  session: TuttiSessionRow;
  players: TuttiPlayerRow[];
  answers: TuttiAnswerRow[];
  userId: string;
}

/** Fixed widths keep every category readable no matter how many there are:
 * the sheet scrolls sideways instead of squeezing its columns. */
const CATEGORY_WIDTH = 172;
const PLAYER_WIDTH = 170;
const TOTAL_WIDTH = 96;
const FULL_CATEGORY_WIDTH = 112;
const FULL_PLAYER_WIDTH = 150;
const FULL_TOTAL_WIDTH = 80;
const MIN_FIT_SCALE = 0.5;
const MAX_FIT_SCALE = 1.7;

/**
 * The round as a sheet: categories across the top, one row per player. The
 * player column stays pinned on the left while the sheet scrolls sideways.
 */
export function TuttiRoundTable({ session, players, answers, userId }: TuttiRoundTableProps) {
  const categories = useMemo(() => categoriesForSession(session), [session]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [graceLeft, setGraceLeft] = useState(TUTTI.graceSeconds);
  const [hints, setHints] = useState<Record<string, TuttiValidation>>({});
  const hintsRoundRef = useRef<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setExpanded(false);
    const onResize = () => setViewportWidth(window.innerWidth);
    onResize();
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [expanded]);

  const isHost = session.host_id === userId;
  const voting = session.status === 'round_voting';
  const writing = session.status === 'round_active' || session.status === 'round_grace';
  const pointsPending = writing;

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

  // Round points per player, summed from the verdicts so far — shown live
  // while voting and final once the round is scored.
  const roundPoints = useMemo(() => {
    const sums: Record<string, number> = {};
    for (const a of answers) {
      if (a.round !== session.current_round || a.is_valid === null) continue;
      sums[a.player_id] = (sums[a.player_id] ?? 0) + (a.points ?? 0);
    }
    return sums;
  }, [answers, session.current_round]);

  // How many categories each player has typed into this round — a live
  // "who's still working" readout while the round is active.
  const submittedCount = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const player of players) {
      counts[player.player_id] = answers.filter(
        (a) => a.player_id === player.player_id && a.round === session.current_round && a.answer.trim()
      ).length;
    }
    return counts;
  }, [answers, players, session.current_round]);

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
      const left = Math.max(0, TUTTI.graceSeconds - Math.floor((Date.now() - bastaAt) / 1000));
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
    if (!writing) return;
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

  function resultLabel(row: TuttiAnswerRow): string {
    if (row.is_valid) return `✓ +${row.points}`;
    switch (row.invalid_reason) {
      case 'empty':
        return 'Vacío';
      case 'wrong_letter':
        return `No empieza con ${session.current_letter}`;
      case 'not_found':
        return 'No existe';
      case 'voted_invalid':
        return 'Votado inválido';
      default:
        return '0 pts';
    }
  }

  function verdictFromRow(row: TuttiAnswerRow | undefined): TuttiVerdict | null {
    if (!row || row.is_valid === null) return null;
    if (!row.is_valid) return 'invalid';
    return row.points === 5 ? 'duplicate_valid' : 'unique_valid';
  }

  // Full screen: the whole sheet keeps compact fixed columns and is scaled to
  // the window's width, so every category is visible at once with no
  // sideways scroll (and it grows on wide screens instead of floating small).
  const playerWidth = expanded ? FULL_PLAYER_WIDTH : PLAYER_WIDTH;
  const totalWidth = expanded ? FULL_TOTAL_WIDTH : TOTAL_WIDTH;
  const categoryWidth = expanded ? FULL_CATEGORY_WIDTH : CATEGORY_WIDTH;
  const columns = `${playerWidth}px repeat(${categories.length}, ${categoryWidth}px) ${totalWidth}px ${totalWidth}px`;
  const sheetWidth = playerWidth + categories.length * categoryWidth + totalWidth * 2;
  const fitScale = expanded ? Math.min(MAX_FIT_SCALE, Math.max(MIN_FIT_SCALE, (viewportWidth - 32) / sheetWidth)) : 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%', maxWidth: 1100, minWidth: 0 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minHeight: 44 }}>
        {writing && (
          <>
            <div style={{ fontSize: 14, color: colors.accentLight, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Completá todas las categorías
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: colors.textMuted, flexWrap: 'wrap', justifyContent: 'center' }}>
              {players.map((p) => (
                <span key={p.id}>
                  {p.nickname}: {submittedCount[p.player_id] ?? 0}/{categories.length}
                </span>
              ))}
            </div>
          </>
        )}
        {session.status === 'round_grace' && (
          <div style={{ fontSize: 14, color: colors.warning, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            ¡Basta de {playerLabel(session.basta_player_id ?? '')}! Se corta en {graceLeft}s
          </div>
        )}
        {voting && (
          <div style={{ fontSize: 14, color: colors.warning, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Voten cada respuesta — único = 10, repetida = 5, inválida = 0
          </div>
        )}
        {(session.status === 'round_results' || session.status === 'finished') && (
          <div style={{ fontSize: 14, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Resultados de la ronda
          </div>
        )}
      </div>

      <button
        onClick={() => setExpanded((v) => !v)}
        style={
          expanded
            ? {
                position: 'fixed',
                top: 12,
                right: 12,
                zIndex: 61,
                padding: '8px 16px',
                background: colors.accent,
                border: 'none',
                color: '#fff',
                fontSize: 12,
                fontWeight: 800,
                textTransform: 'uppercase',
                cursor: 'pointer',
              }
            : {
                alignSelf: 'flex-end',
                padding: '6px 14px',
                background: 'none',
                border: `1px solid ${colors.borderStrong}`,
                color: colors.textSecondary,
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                cursor: 'pointer',
              }
        }
      >
        {expanded ? '✕ Salir de pantalla completa' : '⛶ Pantalla completa'}
      </button>

      <div
        key={expanded ? 'full' : 'normal'}
        style={
          expanded
            ? {
                position: 'fixed',
                inset: 0,
                zIndex: 60,
                overflow: 'auto',
                padding: '56px 16px 16px',
                boxSizing: 'border-box',
                background: colors.bg,
              }
            : {
                width: '100%',
                maxWidth: '100%',
                overflowX: 'auto',
                border: `1px solid ${colors.accent}`,
                background: colors.surface,
              }
        }
      >
        <div style={{ width: sheetWidth, zoom: fitScale }}>
          <div style={{ display: 'grid', gridTemplateColumns: columns, background: 'rgba(47,174,76,0.1)' }}>
            <div style={{ ...cell, ...pinned, ...headerCorner }}>
              <span style={{ fontSize: 11, color: colors.textMuted, fontWeight: 700 }}>RONDA {session.current_round}</span>
              <span style={{ fontFamily: fonts.display, fontSize: 34, color: colors.accentLight, lineHeight: 1 }}>
                {session.current_letter}
              </span>
            </div>
            {categories.map((c) => (
              <div key={c.key} style={{ ...cell, ...categoryHeader }}>
                <span style={{ fontSize: 16 }}>{c.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3, lineHeight: 1.25 }}>
                  {c.label}
                </span>
              </div>
            ))}
            <div style={{ ...cell, ...totalHeader }}>Ronda</div>
            <div style={{ ...cell, ...totalHeader }}>Total</div>
          </div>

          {players.map((player) => {
            const isMe = player.player_id === userId;
            return (
              <div key={player.id} style={{ display: 'grid', gridTemplateColumns: columns, borderTop: `1px solid ${colors.border}` }}>
                <div style={{ ...cell, ...pinned, ...playerLabelCell }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#fff', textTransform: 'uppercase' }}>
                    {isMe ? `${player.nickname} (vos)` : player.nickname}
                  </span>
                  {player.player_id === session.host_id && (
                    <span style={{ fontSize: 10, color: colors.accentLight, textTransform: 'uppercase' }}>Host 👑</span>
                  )}
                </div>

                {categories.map((c) => {
                  const row = isMe
                    ? myAnswers[c.key]
                    : answers.find(
                        (a) => a.player_id === player.player_id && a.category_key === c.key && a.round === session.current_round
                      );

                  if (writing) {
                    if (isMe) {
                      return (
                        <div key={c.key} style={{ ...cell, ...answerCell }}>
                          <input
                            value={draft[c.key] ?? ''}
                            onChange={(e) => handleAnswerChange(c.key, e.target.value)}
                            onBlur={() => handleAnswerBlur(c.key)}
                            placeholder={session.current_letter ?? ''}
                            style={inputStyle}
                          />
                        </div>
                      );
                    }
                    return (
                      <div key={c.key} style={{ ...cell, ...answerCell }}>
                        <span style={{ color: colors.textMuted, letterSpacing: 2 }}>{row?.answer?.trim() ? '●●●' : '…'}</span>
                      </div>
                    );
                  }

                  if (voting) {
                    if (!row || !row.answer.trim()) {
                      return (
                        <div key={c.key} style={{ ...cell, ...answerCell }}>
                          <span style={{ color: colors.textMuted }}>Vacío</span>
                        </div>
                      );
                    }
                    const hint = hints[row.id];
                    const dupGroup = duplicateGroups.get(`${c.key}|${row.answer.trim().toLowerCase()}`) ?? [];
                    const others = dupGroup.filter((d) => d.player_id !== player.player_id).map((d) => playerLabel(d.player_id));
                    return (
                      <div key={c.key} style={{ ...cell, ...answerCell }}>
                        <div style={{ fontWeight: 800, color: '#fff', textTransform: 'uppercase', fontSize: 14, wordBreak: 'break-word' }}>
                          {row.answer}
                        </div>
                        {hint && (
                          <div style={{ fontSize: 11, color: hint.valid ? colors.accentLight : colors.textMuted }}>
                            {hint.valid ? '💡 parece real' : '💡 no se encontró'}
                          </div>
                        )}
                        {others.length > 0 && (
                          <div style={{ fontSize: 11, color: colors.warning }}>coincide con {others.join(', ')}</div>
                        )}
                        {isMe ? (
                          <div style={{ fontSize: 11, color: colors.textMuted }}>Lo votan los demás</div>
                        ) : (
                          <VerdictButtons active={verdictFromRow(row)} onPick={(v) => handleVerdict(row.id, v)} />
                        )}
                      </div>
                    );
                  }

                  return (
                    <div key={c.key} style={{ ...cell, ...answerCell }}>
                      <span
                        style={{
                          color: row?.is_valid ? colors.accentLight : row?.invalid_reason === 'empty' ? colors.textMuted : colors.danger,
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          wordBreak: 'break-word',
                        }}
                      >
                        {row?.answer || '—'}
                      </span>
                      {row && <div style={{ fontSize: 11, color: colors.textMuted }}>{resultLabel(row)}</div>}
                    </div>
                  );
                })}

                <div style={{ ...cell, ...totalValue, color: colors.textSecondary }}>
                  {pointsPending ? '—' : roundPoints[player.player_id] ?? 0}
                </div>
                <div style={{ ...cell, ...totalValue, color: colors.accentLight }}>{player.total_score}</div>
              </div>
            );
          })}
        </div>
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

      {errorMsg && <div style={{ color: colors.danger, fontSize: 13 }}>{errorMsg}</div>}
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
    <div style={{ display: 'flex', gap: 4, marginTop: 4, width: '100%', boxSizing: 'border-box' }}>
      {options.map((o) => (
        <button
          key={o.verdict}
          title={o.title}
          onClick={() => onPick(o.verdict)}
          style={{
            flex: 1,
            minWidth: 0,
            padding: '6px 0',
            fontSize: 13,
            fontWeight: 800,
            border: `1px solid ${active === o.verdict ? colors.accentLight : colors.borderStrong}`,
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

const cell: CSSProperties = {
  padding: '12px 12px',
  borderLeft: `1px solid ${colors.border}`,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  gap: 4,
  textAlign: 'center',
  minHeight: 96,
  boxSizing: 'border-box',
  minWidth: 0,
};

const pinned: CSSProperties = {
  position: 'sticky',
  left: 0,
  zIndex: 1,
  background: '#0f0f11',
  borderLeft: 'none',
};

const headerCorner: CSSProperties = {
  alignItems: 'center',
  minHeight: 64,
  zIndex: 2,
  background: '#0f0f11',
};

const categoryHeader: CSSProperties = {
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(255,255,255,0.03)',
  minHeight: 64,
};

const totalHeader: CSSProperties = {
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 11,
  fontWeight: 800,
  color: colors.textMuted,
  textTransform: 'uppercase',
  minHeight: 64,
};

const playerLabelCell: CSSProperties = {
  alignItems: 'flex-start',
  justifyContent: 'center',
  padding: '14px 14px',
};

const answerCell: CSSProperties = {
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 14,
};

const totalValue: CSSProperties = {
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: fonts.display,
  fontSize: 26,
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '8px 6px',
  background: 'rgba(255,255,255,0.04)',
  border: `1px solid ${colors.borderFaint}`,
  color: '#fff',
  fontSize: 14,
  fontWeight: 700,
  textAlign: 'center',
  textTransform: 'uppercase',
  boxSizing: 'border-box',
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
