# Modelo del jugador de POTRERO

`jugador.glb` es el personaje que usa el juego. Si borrás este archivo, el
juego vuelve al jugador armado por código.

## El que viene puesto

"man base character (rigged)", de grab3d.com (auto-rig de Meshy, 24 huesos
estilo Mixamo, clips `walk` y `run`). Según los datos que trae el propio
archivo, la licencia es CC0-1.0 (dominio público). Conviene confirmarlo en la
página de donde se bajó.

El original tenía 262 mil triángulos y pesaba 11,4 MB. Se redujo a 15 mil
triángulos y texturas de 1024 px (1,4 MB), con el esqueleto y las dos
animaciones intactos.

Lo que el modelo no trae lo resuelve el juego:
- Quieto, patada, gambeta, caída, festejos y saludos: los arma
  `src/components/street/characters/bonePoser.ts` moviendo los huesos.
- Colores del equipo: el modelo tiene una sola textura con la ropa gris; un
  shader pinta la remera y el short según la altura del cuerpo
  (`STREET_CHARACTER.colorKey`).

La adaptación completa está en `STREET_CHARACTER` (src/config/gameConfig.ts):
`clipNames`, `colorKey`, `poseBones`, `armsDown` y `numberBone`.

## Para poner otro

Reemplazá `jugador.glb` y ajustá esos valores. Qué nombres reconoce el juego
sin traducción está explicado en `src/components/street/characters/types.ts`.
Si el modelo trae sus propias animaciones (idle, pass, shot...), se usan esas
en lugar de las poses armadas por código.
