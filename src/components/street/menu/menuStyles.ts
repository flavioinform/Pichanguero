/**
 * Estilos del menú de POTRERO. Todo el menú se tiñe con --team (el color
 * principal de tu equipo): se pone en la raíz de cada pantalla.
 *
 * Para cambiar la paleta, editá las variables de .pm (los colores) o el valor
 * de --cut (qué tan cortadas son las esquinas). Las fuentes son Anton (títulos
 * y números) y Manrope (el resto), las mismas que ya carga la app.
 */
export const MENU_CSS = `
.pm {
  --asphalt: #1a1b1f;
  --concrete: #26282e;
  --concrete-2: #31343b;
  --chalk: #efece2;
  --chalk-dim: rgba(239, 236, 226, 0.66);
  --sodium: #ffb347;
  --team: #2e5bd8;
  --team-ink: #ffffff;
  --cut: 16px;
  --edge: color-mix(in srgb, var(--team) 62%, transparent);
  position: relative;
  /* por encima de la capa oscura del fondo de la app (que está en z-index 1) */
  z-index: 2;
  width: 100%;
  height: 100%;
  overflow: hidden;
  color: var(--chalk);
  font-family: 'Manrope', system-ui, sans-serif;
  background: var(--asphalt);
}
.pm *, .pm *::before, .pm *::after { box-sizing: border-box; }
/* :where() deja el reseteo con la especificidad mínima, para que las clases de cada botón (Anton, tamaños) ganen */
:where(.pm) button, :where(.pm) input { font: inherit; color: inherit; }
:where(.pm) button { cursor: pointer; }

/* títulos y números: condensada, mayúsculas */
.pm-title { font-family: 'Anton', Impact, sans-serif; text-transform: uppercase; letter-spacing: 0.04em; line-height: 0.95; margin: 0; font-weight: 400; }
.pm-h1 { font-size: clamp(40px, 7vw, 84px); }
.pm-h2 { font-size: clamp(26px, 3.4vw, 40px); }
.pm-h3 { font-size: 20px; }
.pm-dim { color: var(--chalk-dim); }
.pm-small { font-size: 13px; line-height: 1.4; }

/* cada pantalla entra deslizando y apareciendo; sus bloques, uno tras otro */
.pm-screen { position: absolute; inset: 0; display: flex; flex-direction: column; animation: pm-in 0.42s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
.pm-stagger > * { animation: pm-in 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
.pm-stagger > *:nth-child(2) { animation-delay: 0.06s; }
.pm-stagger > *:nth-child(3) { animation-delay: 0.12s; }
.pm-stagger > *:nth-child(4) { animation-delay: 0.18s; }
.pm-stagger > *:nth-child(5) { animation-delay: 0.24s; }
@keyframes pm-in { from { opacity: 0; transform: translateX(28px); } to { opacity: 1; transform: none; } }

/* panel: esquinas cortadas y un borde fino del color del equipo */
.pm-panel {
  position: relative;
  padding: 18px;
  background: var(--edge);
  clip-path: polygon(0 0, calc(100% - var(--cut)) 0, 100% var(--cut), 100% 100%, var(--cut) 100%, 0 calc(100% - var(--cut)));
}
.pm-panel::before {
  content: '';
  position: absolute;
  inset: 1px;
  background: var(--concrete);
  clip-path: polygon(0 0, calc(100% - var(--cut) + 1px) 0, 100% calc(var(--cut) - 1px), 100% 100%, calc(var(--cut) - 1px) 100%, 0 calc(100% - var(--cut) + 1px));
}
.pm-panel > * { position: relative; }
.pm-panel.flat::before { background: color-mix(in srgb, var(--concrete) 82%, transparent); }

/* botones */
.pm-btn {
  position: relative;
  border: 0;
  padding: 13px 26px;
  font-family: 'Anton', Impact, sans-serif;
  font-size: 22px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--asphalt);
  background: var(--sodium);
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%);
  transition: transform 0.14s ease, filter 0.14s ease;
}
.pm-btn:hover { transform: translateY(-2px); filter: brightness(1.08); }
.pm-btn:active { transform: translateY(0); }
.pm-btn.team { background: var(--team); color: var(--team-ink); }
.pm-btn.ghost { background: var(--concrete-2); color: var(--chalk); }
.pm-btn.small { font-size: 15px; padding: 9px 16px; }
.pm-btn.big { font-size: clamp(26px, 3.2vw, 38px); padding: 17px 40px; }
.pm-btn[disabled] { opacity: 0.45; cursor: default; transform: none; filter: none; }
.pm :focus-visible { outline: 3px solid var(--chalk); outline-offset: 3px; }

/* botones del menú principal: números grandes, bloque con borde del equipo */
.pm-menu-item {
  display: block;
  width: min(420px, 100%);
  text-align: left;
  border: 0;
  padding: 14px 26px;
  font-family: 'Anton', Impact, sans-serif;
  font-size: clamp(30px, 4.4vw, 46px);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  background: color-mix(in srgb, var(--asphalt) 78%, transparent);
  border-left: 8px solid var(--team);
  clip-path: polygon(0 0, 100% 0, calc(100% - 18px) 100%, 0 100%);
  transition: transform 0.16s ease, background 0.16s ease, border-color 0.16s ease;
}
.pm-menu-item:hover, .pm-menu-item:focus-visible { transform: translateX(10px); background: var(--team); color: var(--team-ink); }
.pm-menu-item.main { border-left-color: var(--sodium); }

/* pestañas */
.pm-tabs { display: flex; gap: 2px; border-bottom: 2px solid var(--concrete-2); margin-bottom: 14px; flex-wrap: wrap; }
.pm-tab {
  border: 0;
  background: none;
  padding: 10px 9px;
  font-family: 'Anton', Impact, sans-serif;
  font-size: 14px;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--chalk-dim);
  border-bottom: 4px solid transparent;
  margin-bottom: -2px;
}
.pm-tab:hover { color: var(--chalk); }
.pm-tab[aria-selected='true'] { color: var(--chalk); border-bottom-color: var(--team); }

/* fichas de opciones y selectores */
.pm-label { display: block; font-size: 13px; font-weight: 700; margin: 14px 0 7px; color: var(--chalk-dim); }
.pm-label:first-child { margin-top: 0; }
.pm-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.pm-chip {
  border: 1px solid var(--concrete-2);
  background: var(--asphalt);
  padding: 7px 12px;
  font-size: 13px;
  font-weight: 700;
  clip-path: polygon(0 0, calc(100% - 7px) 0, 100% 7px, 100% 100%, 7px 100%, 0 calc(100% - 7px));
  transition: background 0.12s ease, border-color 0.12s ease;
}
.pm-chip:hover { border-color: var(--team); }
.pm-chip[aria-pressed='true'] { background: var(--team); color: var(--team-ink); border-color: var(--team); }
.pm-swatches { display: flex; flex-wrap: wrap; gap: 6px; }
.pm-swatch {
  width: 30px;
  height: 30px;
  border: 2px solid transparent;
  outline: 1px solid rgba(255, 255, 255, 0.22);
  padding: 0;
  clip-path: polygon(0 0, calc(100% - 7px) 0, 100% 7px, 100% 100%, 7px 100%, 0 calc(100% - 7px));
  transition: transform 0.12s ease;
}
.pm-swatch:hover { transform: scale(1.12); }
.pm-swatch[aria-pressed='true'] { border-color: var(--chalk); outline-color: var(--chalk); transform: scale(1.1); }

/* campos de texto */
.pm-input {
  width: 100%;
  background: var(--asphalt);
  border: 1px solid var(--concrete-2);
  padding: 10px 12px;
  font-size: 16px;
  font-weight: 700;
}
.pm-input:focus { outline: none; border-color: var(--team); box-shadow: 0 0 0 2px color-mix(in srgb, var(--team) 40%, transparent); }
.pm-error { color: #ff8f7a; font-size: 13px; margin-top: 6px; }

/* tarjeta de jugador */
.pm-card {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  text-align: left;
  padding: 10px 12px;
  border: 0;
  background: var(--concrete);
  border-left: 5px solid var(--concrete-2);
  clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%);
  transition: transform 0.14s ease, background 0.14s ease, border-color 0.14s ease;
}
.pm-card:hover { transform: translateX(4px); background: var(--concrete-2); }
.pm-card[aria-selected='true'] { border-left-color: var(--team); background: color-mix(in srgb, var(--team) 22%, var(--concrete)); }
.pm-card-number { font-family: 'Anton', Impact, sans-serif; font-size: 36px; line-height: 1; min-width: 46px; text-align: center; }

/* barras de estadísticas */
.pm-bar { display: flex; gap: 4px; flex: 1; }
.pm-bar i { flex: 1; height: 14px; background: var(--asphalt); transform: skewX(-18deg); transition: background 0.2s ease; }
.pm-bar i.on { background: var(--team); }
.pm-step { width: 34px; height: 34px; padding: 0; border: 0; background: var(--concrete-2); font-family: 'Manrope', system-ui, sans-serif; font-weight: 800; font-size: 22px; line-height: 1; clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px)); }
.pm-step:hover:not([disabled]) { background: var(--team); color: var(--team-ink); }
.pm-step[disabled] { opacity: 0.35; cursor: default; }

/* interruptor */
.pm-switch { display: flex; align-items: center; justify-content: space-between; gap: 16px; width: 100%; border: 0; background: none; padding: 12px 0; border-bottom: 1px solid var(--concrete-2); text-align: left; }
.pm-switch b { font-family: 'Anton', Impact, sans-serif; font-weight: 400; letter-spacing: 0.06em; text-transform: uppercase; padding: 5px 12px; min-width: 96px; text-align: center; background: var(--asphalt); }
.pm-switch[aria-checked='true'] b { background: var(--team); color: var(--team-ink); }

/* pantallas de ancho completo en el celular */
@media (max-width: 860px) {
  .pm-panel { padding: 14px; }
}
@media (prefers-reduced-motion: reduce) {
  .pm-screen, .pm-stagger > * { animation: none; }
  .pm-btn, .pm-menu-item, .pm-card, .pm-chip, .pm-swatch, .pm-bar i { transition: none; }
}
`;

/** Disposición de las pantallas: tres zonas en escritorio, apiladas en el celular. */
export const MENU_LAYOUT_CSS = `
.pm-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 22px 28px 12px; }
.pm-foot { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; padding: 14px 28px 20px; }
.pm-foot-group { display: flex; flex-wrap: wrap; gap: 10px; }
.pm-team-grid { display: grid; grid-template-columns: 280px minmax(0, 1fr) 400px; gap: 18px; padding: 0 28px; flex: 1; min-height: 0; }
.pm-list { display: flex; flex-direction: column; gap: 10px; align-content: start; }
.pm-stage { position: relative; min-height: 0; }
.pm-stage-hint { position: absolute; left: 0; right: 0; bottom: 6px; text-align: center; pointer-events: none; }
.pm-options { min-height: 0; overflow-y: auto; }
.pm-two { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: 18px; padding: 0 28px; flex: 1; min-height: 0; }
.pm-scroll { overflow-y: auto; min-height: 0; }
.pm-menu-wrap { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; gap: 12px; padding: 0 6vw; background: linear-gradient(90deg, rgba(20, 21, 24, 0.94) 0%, rgba(20, 21, 24, 0.7) 38%, rgba(20, 21, 24, 0) 70%); }
@media (max-width: 960px) {
  .pm-team-grid { grid-template-columns: 1fr; grid-template-rows: auto; overflow-y: auto; padding: 0 16px; }
  .pm-team-grid .pm-stage { order: 1; height: 33vh; min-height: 230px; }
  .pm-team-grid .pm-list { order: 0; flex-direction: row; overflow-x: auto; padding-bottom: 4px; }
  .pm-team-grid .pm-list .pm-card { min-width: 190px; }
  .pm-team-grid .pm-options { order: 2; overflow: visible; }
  .pm-two { grid-template-columns: 1fr; overflow-y: auto; padding: 0 16px; }
  .pm-head { padding: 16px 16px 8px; }
  .pm-foot { padding: 12px 16px 16px; }
  .pm-menu-wrap { padding: 0 20px; background: linear-gradient(0deg, rgba(20, 21, 24, 0.95) 0%, rgba(20, 21, 24, 0.55) 60%, rgba(20, 21, 24, 0.1) 100%); justify-content: flex-end; padding-bottom: 36px; }
}
`;
