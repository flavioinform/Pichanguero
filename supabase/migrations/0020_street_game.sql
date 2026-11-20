-- "Fútbol callejero 3v3": new minigame row + allow its icon key.
alter table games drop constraint if exists games_icon_key_check;
alter table games add constraint games_icon_key_check check (icon_key in ('grid', 'dice', 'help', 'draft', 'rosco', 'career', 'headsoccer', 'auction', 'street'));

insert into games (id, name, short_desc, how_to_play, icon_key, bg_image_url, is_flagship, sort_order)
values (
  'street',
  'Fútbol callejero',
  'Partidos 3v3 en una cancha chica con paredes, gambetas y goles rápidos.',
  'Movete con las flechas o WASD. J pasa, K tira y L hace la gambeta: un arranque corto en el que nadie te puede quitar la pelota. Si gambeteás encima de un rival le hacés un caño y lo dejás en el piso. Las jugadas lindas llenan el medidor de estilo; lleno, entrás en Modo Crack y cada gol vale doble. Gana quien llegue primero a 5 goles o tenga más cuando se acaba el tiempo.',
  'street',
  '',
  false,
  (select coalesce(max(sort_order), 0) + 1 from games)
)
on conflict (id) do nothing;
