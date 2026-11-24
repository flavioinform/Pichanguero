import { STREET } from '../../config/gameConfig';
import { PLAYER_ROLES, type StreetTeam } from '../../lib/street/team';
import type { StreetState } from '../../lib/street/engine';
import { isGoLabel } from '../../lib/street/intro';

interface IntroOverlayProps {
  phase: StreetState['phase'];
  kind: StreetState['introKind'];
  /** el cartel grande del centro: "3", "2", "1", "¡POTRERO!"... */
  label: string | null;
  /** los dos equipos: de ahí salen los nombres, números y colores de las tarjetas */
  looks: readonly [StreetTeam, StreetTeam];
  /** si este jugador puede saltar la intro (en el online, solo el anfitrión) */
  canSkip: boolean;
  onSkip: () => void;
}

const CSS = `
@keyframes street-card-left { 0% { opacity: 0; transform: translateX(-70px) skewX(-8deg); } 9% { opacity: 1; transform: none; } 88% { opacity: 1; transform: none; } 100% { opacity: 0; transform: translateX(-40px); } }
@keyframes street-card-right { 0% { opacity: 0; transform: translateX(70px) skewX(8deg); } 9% { opacity: 1; transform: none; } 88% { opacity: 1; transform: none; } 100% { opacity: 0; transform: translateX(40px); } }
@keyframes street-count { 0% { opacity: 0; transform: translate(-50%, -50%) scale(2.1); } 22% { opacity: 1; transform: translate(-50%, -50%) scale(1); } 80% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); } }
@keyframes street-hint { 0%, 100% { opacity: 0.45; } 50% { opacity: 0.95; } }
`;

/** Capa de la animación de inicio: barras de cine, tarjetas de jugadores, cuenta regresiva y aviso para saltar. */
export function IntroOverlay({ phase, kind, label, looks, canSkip, onSkip }: IntroOverlayProps) {
  const match = phase === 'intro' && kind === 'match';
  const cards = STREET.intro.cards;

  return (
    <>
      <style>{CSS}</style>

      {/* barras negras de cine: se abren al empezar el partido */}
      {[0, 1].map((side) => (
        <div
          key={side}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            [side === 0 ? 'top' : 'bottom']: 0,
            height: match ? '9%' : 0,
            background: '#000',
            transition: 'height 0.8s ease',
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* tarjetas: nombre y número, el equipo 0 a la izquierda y el 1 a la derecha */}
      {match &&
        ([0, 1] as const).map((team) => (
          <div
            key={team}
            style={{
              position: 'absolute',
              top: '24%',
              [team === 0 ? 'left' : 'right']: '3%',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              alignItems: team === 0 ? 'flex-start' : 'flex-end',
              pointerEvents: 'none',
            }}
          >
            {[0, 1, 2].map((slot) => {
              const info = { number: looks[team].players[slot].number, nickname: looks[team].players[slot].nickname, role: PLAYER_ROLES[slot] };
              return (
                <div
                  key={slot}
                  style={{
                    display: 'flex',
                    flexDirection: team === 0 ? 'row' : 'row-reverse',
                    alignItems: 'center',
                    gap: 10,
                    padding: '6px 14px',
                    background: 'rgba(8,10,14,0.82)',
                    [team === 0 ? 'borderLeft' : 'borderRight']: `5px solid ${looks[team].primary}`,
                    opacity: 0,
                    animation: `street-card-${team === 0 ? 'left' : 'right'} ${cards.endMs - cards.startMs}ms ease-out ${
                      cards.startMs + (team * 3 + slot) * cards.staggerMs * 0.6
                    }ms both`,
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'Impact, system-ui, sans-serif',
                      fontStyle: 'italic',
                      fontSize: 'clamp(22px, 3.6vw, 40px)',
                      lineHeight: 1,
                      color: looks[team].primary,
                      WebkitTextStroke: '1px rgba(0,0,0,0.6)',
                    }}
                  >
                    {info.number}
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: team === 0 ? 'flex-start' : 'flex-end' }}>
                    <span
                      style={{
                        fontSize: 'clamp(13px, 1.9vw, 20px)',
                        fontWeight: 900,
                        letterSpacing: 1,
                        textTransform: 'uppercase',
                        color: '#fff',
                      }}
                    >
                      {info.nickname}
                    </span>
                    <span style={{ fontSize: 'clamp(9px, 1.1vw, 12px)', letterSpacing: 1.4, textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)' }}>
                      {info.role}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        ))}

      {/* cuenta regresiva: 3, 2, 1 y la salida */}
      {phase === 'intro' && label && (
        <div
          key={label}
          style={{
            position: 'absolute',
            left: '50%',
            top: '46%',
            transform: 'translate(-50%, -50%)',
            fontFamily: 'Impact, system-ui, sans-serif',
            fontStyle: 'italic',
            letterSpacing: 2,
            whiteSpace: 'nowrap',
            fontSize: label.length > 2 ? 'clamp(40px, 9vw, 110px)' : 'clamp(70px, 15vw, 190px)',
            color: isGoLabel(label) ? '#ffd64a' : '#ffffff',
            WebkitTextStroke: '3px rgba(0,0,0,0.85)',
            textShadow: '0 6px 0 rgba(0,0,0,0.6), 0 0 30px rgba(0,0,0,0.6)',
            animation: `street-count ${kind === 'match' ? STREET.intro.countdown.beatMs : 900}ms ease-out both`,
            pointerEvents: 'none',
          }}
        >
          {label}
        </div>
      )}

      {/* un clic en cualquier parte, o Espacio / Enter, salta la intro */}
      {match && canSkip && (
        <>
          <div onPointerDown={onSkip} style={{ position: 'absolute', inset: 0, cursor: 'pointer' }} />
          <div
            style={{
              position: 'absolute',
              left: '50%',
              bottom: '11%',
              transform: 'translateX(-50%)',
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
              color: '#fff',
              textShadow: '0 1px 4px rgba(0,0,0,0.9)',
              animation: 'street-hint 1.6s ease-in-out infinite',
              pointerEvents: 'none',
            }}
          >
            Espacio o clic para saltar
          </div>
        </>
      )}
    </>
  );
}
