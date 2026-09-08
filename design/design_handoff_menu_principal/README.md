# Handoff: Menú principal Pichanguero

## Overview
Menú principal (hub) de Pichanguero, plataforma web de minijuegos de fútbol. Carrusel horizontal de 3 juegos con estética oscura tipo PES/FIFA, pantalla de detalle por juego y placeholder de carga. Incluye 2 slots de espacio publicitario.

## About the Design Files
Los archivos de este bundle (`Pichanguero Menu.dc.html`) son **referencias de diseño en HTML** — prototipos que muestran el look & feel y el comportamiento deseado, no código de producción para copiar. La tarea es **recrear este diseño en React + TypeScript**, conectado a Supabase, usando los patrones y librerías ya establecidos en el proyecto (o, si no existen, elegir los más apropiados).

## Fidelity
**Alta fidelidad (hifi)**: colores, tipografía, espaciado y layout finales. Recrear pixel-perfect usando las librerías/patrones del stack de destino.

## Stack objetivo
- React + TypeScript
- Supabase (Postgres + Realtime + Storage)

## Screens / Views

### 1. Menú (estado `screen === 'menu'`)
**Propósito**: elegir un juego del carrusel y confirmar para ver su detalle.

**Layout**: contenedor raíz `position:relative`, 100vw x 100vh, `overflow:hidden`, fondo `#0a0a0c`, fuente `Manrope`. Estructura en columna (`flex-direction:column`) sobre el fondo:
1. Logo arriba-izquierda (`top:32px; left:48px`, altura 52px)
2. Slot de ads arriba-derecha (`top:28px; right:48px`, 260x60px)
3. Bloque de texto del juego seleccionado (`margin-top: clamp(84px,13vh,110px)`, `padding-left:64px`, `max-width:600px`)
4. Fila del carrusel (`flex:1`, alineada al fondo del bloque con `justify-content:flex-end`)
5. Banner de ads horizontal (64px alto, márgenes laterales 40px)
6. Barra inferior (84px alto) con versión de app y botón Confirmar centrado

**Fondo**: por cada juego hay una capa `position:absolute;inset:0` con una imagen (image-slot), opacidad 1 si es el juego seleccionado, 0 si no — transición `opacity 0.6s ease` (crossfade al cambiar de juego). Encima, un overlay de 2 gradientes fijos:
- Gradiente diagonal 105deg: `rgba(4,4,5,0.97)` en 0% → `rgba(4,4,5,0.4)` en 70% → `rgba(4,4,5,0.6)` en 100% (oscurece más el lado izquierdo, donde va el texto)
- Gradiente vertical: oscurece arriba (0.6) y abajo (0.92), transparente en el medio (22%–68%)

**Componentes**:
- **Badge "Juego insignia"**: solo si `flagship`. `background:#2fae4c`, texto blanco, `font-size:12px`, `font-weight:800`, `letter-spacing:1.5px`, `padding:5px 12px`, uppercase.
- **Título**: `Anton`, `font-size:58px`, `line-height:1`, uppercase, blanco, `text-shadow:0 2px 18px rgba(0,0,0,0.6)`.
- **Descripción corta**: `Manrope`, `18px`, `color:#c7c7cc`, `line-height:1.5`.
- **Tarjeta seleccionada**: `width:clamp(140px,17vw,240px)`, `height:clamp(220px,52vh,380px)`, `border:3px solid #2fae4c`, `background:rgba(18,18,20,0.6)`, `box-shadow:0 0 32px rgba(47,174,76,0.35)`. Ícono SVG centrado (90x90) por tipo de juego (grilla / dados / signo de pregunta), color `#4cd964`.
- **Iconos de otros juegos**: `width:clamp(70px,7vw,100px)`, `height:clamp(90px,22vh,130px)`, borde `1px solid rgba(255,255,255,0.18)`, fondo `rgba(18,18,20,0.4)`. Hover: borde `rgba(47,174,76,0.7)`, fondo `rgba(20,30,22,0.55)`. Ícono SVG 38x38, color `#b8b8bc`.
- **Flechas de navegación**: botones circulares 48x48px, borde `1px solid rgba(255,255,255,0.25)`, fondo `rgba(10,10,12,0.55)`. Ícono de balón de fútbol (SVG, círculo + pentágono central). Hover: borde/color `#2fae4c` / `#4cd964`.
- **Línea divisoria** sobre la fila del carrusel: `border-top:1px solid rgba(255,255,255,0.18)`.
- **Slots de publicidad**: bordes punteados `1px dashed rgba(255,255,255,0.3-0.35)`, fondo `rgba(0,0,0,0.3-0.35)`, texto centrado uppercase `rgba(255,255,255,0.4-0.45)`. Dos posiciones: banner superior derecho (260x60) y banner horizontal previo a la barra inferior (64px alto).
- **Botón Confirmar**: centrado horizontalmente en la barra inferior, borde `1px solid rgba(255,255,255,0.25)`, fondo `rgba(47,174,76,0.18)`, icono circular verde con letra "A", texto uppercase `15px` `font-weight:700`. Hover: fondo `rgba(47,174,76,0.32)`, borde `#2fae4c`.
- **Versión de app**: esquina inferior izquierda de la barra, `13px`, `color:#8a8a8e`.

### 2. Detalle de juego (estado `screen === 'detail'`)
**Propósito**: ver nombre, descripción, cómo se juega, y confirmar inicio.

**Layout**: botón "VOLVER" arriba-izquierda con flecha. Contenido centrado verticalmente en 2 columnas (`gap:72px`, `padding:0 90px`): texto a la izquierda (max-width 560px), tarjeta grande a la derecha (260x320px, mismo estilo que la tarjeta seleccionada del menú pero fija).

**Componentes**:
- Mismo badge, título (52px), descripción que en el menú.
- **Bloque "Cómo se juega"**: `border-left:3px solid #2fae4c`, `padding-left:20px`. Label uppercase `12px` `color:#4cd964` `font-weight:800`. Texto `16px` `color:#e2e2e5`.
- **Botón "Iniciar"**: sólido `background:#2fae4c`, texto blanco uppercase `15px` `font-weight:800`, `padding:14px 34px`. Hover: `background:#23913c`.
- Versión de app en esquina inferior derecha.

### 3. Cargando (estado `screen === 'loading'`)
Placeholder de "próximamente": spinner circular, título "Cargando {juego}…" en Anton 26px, subtítulo "(Próximamente)", botón "Volver al menú".

## Interactions & Behavior
- **Teclado** (solo en `menu`): `ArrowRight` → siguiente juego, `ArrowLeft` → anterior, `Enter` → confirmar (va a detalle).
- **Teclado** (en `detail`): `Escape`/`Backspace` → volver al menú, `Enter` → iniciar juego (va a loading).
- **Teclado** (en `loading`): `Escape` → volver al menú.
- **Click en icono lateral**: selecciona ese juego como el destacado (misma acción que llegar por flechas).
- **Click en flechas**: mismo efecto que las teclas de flecha.
- **Transición de fondo**: crossfade de 0.6s entre las imágenes de fondo de cada juego al cambiar de selección.
- **Flujo obligatorio**: Menú → (confirmar) → Detalle → (Iniciar) → Loading/placeholder. Nunca se entra directo al juego desde el menú.

## State Management
Estado mínimo necesario:
```ts
type Screen = 'menu' | 'detail' | 'loading';
interface AppState {
  screen: Screen;
  selectedIndex: number; // índice del juego destacado en el carrusel
}
```
Transiciones:
- `prev()/next()`: `selectedIndex = (selectedIndex ± 1 + N) % N`
- `confirm()`: `screen = 'detail'`
- `startGame()`: `screen = 'loading'` (o navegar a la ruta real del juego cuando exista)
- `backToMenu()`: `screen = 'menu'`

## Data Model (Supabase)
Reemplazar el array `GAMES` hardcodeado por una tabla:
```sql
create table games (
  id text primary key,
  name text not null,
  short_desc text not null,
  how_to_play text not null,
  icon_key text not null,       -- 'grid' | 'dice' | 'help' (o clave de ícono)
  bg_image_url text not null,   -- Supabase Storage URL
  is_flagship boolean default false,
  sort_order int not null
);
```
- Cargar `games` ordenados por `sort_order` al montar el menú.
- Para "Gato futbolero" (online por turnos): tablas adicionales `game_sessions` (id, game_id, player_a, player_b, status, current_turn) y `grid_cells`/`game_turns` (respuestas, validación). Usar **Supabase Realtime** (channel por `session_id`) para sincronizar turnos entre ambos jugadores en vivo.
- Imágenes de fondo y logo: subir a **Supabase Storage**, usar URLs públicas o firmadas en `bg_image_url`.

## Design Tokens
- **Colores**: fondo `#0a0a0c`; acento verde `#2fae4c` (base), `#4cd964` (claro/hover), `#23913c` (oscuro/pressed); texto blanco `#f5f5f5`/`#fff`; texto secundario `#c7c7cc`, `#9a9a9e`, `#8a8a8e`, `#6f6f74`, `#b8b8bc`.
- **Tipografía**: `Anton` (títulos, uppercase) — 58px (menú), 52px (detalle), 26px (loading). `Manrope` (cuerpo) — pesos 400/500/600/700/800; 18px descripciones, 16px texto "cómo se juega", 12-15px labels/botones.
- **Bordes**: `3px solid` acento en tarjetas destacadas; `1px solid rgba(255,255,255,0.18-0.25)` en elementos secundarios; `1px dashed` en placeholders de ads.
- **Radios**: 0 en tarjetas/botones rectangulares; `50%` en botones circulares (flechas, avatar del botón Confirmar).
- **Sombras**: `box-shadow:0 0 32-40px rgba(47,174,76,0.3-0.35)` en tarjetas destacadas (glow verde).

## Assets
- `pichanguero-logo.png` — logo/wordmark (proporcionado por el usuario, recortado de un sheet).
- Fondos por juego: `bg-gato.png`, `bg-tutti.png`, `bg-adivina.png` (fotos de stock/subidas por el usuario — reemplazar por assets finales en mayor resolución, idealmente ≥1920px de ancho para evitar pixelado).
- Iconos SVG inline dibujados a mano (grilla, dados, signo de pregunta, balón de fútbol) — se pueden migrar a un set de iconos del proyecto o mantenerse como SVG.

## Files
- `Pichanguero Menu.dc.html` — diseño de referencia completo (las 3 pantallas: menú, detalle, loading).
