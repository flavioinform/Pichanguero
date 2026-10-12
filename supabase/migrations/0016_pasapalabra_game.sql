-- The "draft" menu slot becomes the solo Pasapalabra futbolero (rosco with a
-- timer). Same game id so existing menu/ordering stays intact; only the
-- copy and the icon change. The icon constraint has to be dropped first so
-- the row can switch to 'rosco', then re-created with that value allowed.
alter table games drop constraint if exists games_icon_key_check;

update games
set
  name = 'Pasapalabra futbolero',
  short_desc = 'El rosco del fútbol: 27 letras, 3 minutos y una pista por letra.',
  how_to_play = 'Tenés 3 minutos para pasar por las 27 letras. Cada pista tiene una respuesta que empieza con esa letra. Si no la sabés, usá Pasapalabra para volver a ella al final. Una respuesta mal da la letra por perdida.',
  icon_key = 'rosco'
where id = 'draft';

alter table games add constraint games_icon_key_check
  check (icon_key in ('grid', 'dice', 'help', 'rosco', 'career', 'headsoccer', 'auction'));
