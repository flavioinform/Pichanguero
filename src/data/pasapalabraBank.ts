// Question bank for the rosco. Every answer starts with its letter. Each entry
// has a kind: 'def' is a plain definition, 'starts' reveals the opening of the
// answer ("Empieza por AT"), 'contains' reveals a fragment inside it
// ("Contiene OBE"). A letter can have several entries so a player who
// already saw one gets another; the game tracks which ones each player used.

export type ClueKind = 'def' | 'starts' | 'contains';

export interface BankEntry {
  id: string;
  letter: string;
  kind: ClueKind;
  clue: string;
  answer: string;
  aliases: string[];
}

export const LETTERS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'Ñ',
  'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
] as const;

type Row = [letter: string, kind: ClueKind, clue: string, answer: string, aliases?: string[]];

const ROWS: Row[] = [
  ['A', 'def', 'Club español de Madrid de camiseta rojiblanca', 'Atlético de Madrid', ['atletico', 'atletico madrid', 'atleti']],
  ['A', 'starts', 'Campeona del mundo en 2022 con Messi de capitán', 'Argentina', ['argentina']],
  ['A', 'contains', 'Puesto que dirige el partido desde el centro del campo', 'Árbitro', ['arbitro']],
  ['B', 'def', 'País campeón del mundo cinco veces', 'Brasil', ['brazil']],
  ['B', 'starts', 'Premio al mejor jugador del año, dorado', 'Balón de Oro', ['balon de oro', 'ballon d or', 'ballon dor']],
  ['B', 'contains', 'Club alemán de Múnich, de camiseta roja', 'Bayern Múnich', ['bayern', 'bayern munich']],
  ['C', 'def', 'Estadio del FC Barcelona', 'Camp Nou', ['nou camp', 'el camp nou']],
  ['C', 'starts', 'Torneo de clubes de Europa, el más importante', 'Champions League', ['champions', 'liga de campeones', 'champions league']],
  ['C', 'contains', 'Selección centroamericana de Keylor Navas', 'Costa Rica', ['costa rica']],
  ['D', 'def', 'Puesto del jugador que cuida la última línea de su arco', 'Defensor', ['defensa', 'defensor central', 'zaguero']],
  ['D', 'starts', 'Lateral brasileño que jugó en Barcelona y PSG', 'Dani Alves', ['alves', 'dani alves']],
  ['D', 'contains', 'Golpe de pie con fuerza desde lejos, el que busca el arco', 'Disparo', ['tiro', 'remate']],
  ['E', 'def', 'Torneo de selecciones europeas que se juega cada cuatro años', 'Eurocopa', ['euro', 'copa europa']],
  ['E', 'starts', 'Estadio de Lisboa, casa del Benfica', 'Estadio da Luz', ['da luz']],
  ['E', 'contains', 'Selección campeona de Europa en 2008 y 2012 y del Mundo en 2010', 'España', ['espana', 'spain']],
  ['F', 'def', 'Organismo que rige el fútbol mundial', 'FIFA', ['fifa']],
  ['F', 'starts', 'Club carioca de camiseta roja y negra, el más popular de Brasil', 'Flamengo', ['flamengo', 'clube de regatas do flamengo']],
  ['F', 'contains', 'Goleador francés de 13 goles en el Mundial de 1958', 'Fontaine', ['just fontaine']],
  ['G', 'def', 'Portero, también llamado arquero', 'Guardameta', ['guardavallas', 'golero']],
  ['G', 'starts', 'Goleador histórico del Bayern, apodado Bomber', 'Gerd Müller', ['muller', 'gerd muller']],
  ['G', 'def', 'Tanto, anotación que suma a un marcador', 'Gol', ['goal', 'tanto']],
  ['H', 'def', 'Tres goles de un mismo jugador en un partido', 'Hat-trick', ['hattrick', 'hat trick']],
  ['H', 'starts', 'Selección que se llama Países Bajos, con camiseta naranja', 'Holanda', ['holanda', 'netherlands', 'paises bajos']],
  ['H', 'contains', 'Gran mediocampista rumano, apodado el Maradona de los Cárpatos', 'Hagi', ['gheorghe hagi']],
  ['I', 'def', 'Club de Milán apodado Nerazzurri', 'Inter', ['inter de milan', 'inter milan', 'internazionale']],
  ['I', 'starts', 'Cuna del fútbol, selección que lo inventó', 'Inglaterra', ['england', 'inglaterra']],
  ['I', 'contains', 'Selección italiana campeona del mundo en 2006', 'Italia', ['italy']],
  ['J', 'def', 'País asiático que jugó su primer Mundial en 1998', 'Japón', ['japon', 'japan']],
  ['J', 'starts', 'Brasileño campeón del mundo en 1970 que marcó en todos los partidos', 'Jairzinho', ['jairzinho']],
  ['J', 'contains', 'Club italiano de Turín, apodado la Vecchia Signora', 'Juventus', ['juve']],
  ['K', 'def', 'Brasileño, Balón de Oro 2007 con el Milan', 'Kaká', ['kaka']],
  ['K', 'starts', 'Portero costarricense del Real Madrid, campeón de tres Champions', 'Keylor Navas', ['navas', 'keylor']],
  ['K', 'contains', 'Mediocampista alemán del Real Madrid, con cuatro Champions', 'Kroos', ['toni kroos']],
  ['L', 'def', 'Torneo de clubes de primera división de España', 'La Liga', ['liga', 'laliga', 'liga española']],
  ['L', 'starts', 'Argentino con ocho Balones de Oro', 'Lionel Messi', ['messi']],
  ['L', 'contains', 'Club inglés de Anfield, con camiseta roja', 'Liverpool', ['liverpool fc']],
  ['M', 'def', 'Argentino que brilló en el Barcelona, el 10 más famoso', 'Messi', ['lionel messi']],
  ['M', 'starts', 'Torneo de selecciones que se juega cada cuatro años', 'Mundial', ['copa del mundo', 'world cup']],
  ['M', 'contains', 'Club inglés de Manchester, dirigido por Ferguson', 'Manchester United', ['man utd', 'manchester utd', 'man united', 'united']],
  ['N', 'def', 'Brasileño del Barcelona y el PSG, delantero de la selección', 'Neymar', ['neymar jr', 'neymar junior']],
  ['N', 'starts', 'Club uruguayo de Montevideo, el más campeón de su país', 'Nacional', ['club nacional']],
  ['N', 'contains', 'Puesto del delantero centro, el número nueve', 'Nueve', ['9', 'numero 9']],
  ['Ñ', 'def', 'Club chileno de la ciudad de Chillán', 'Ñublense', ['nublense']],
  ['O', 'def', 'Portero esloveno del Atlético de Madrid', 'Oblak', ['jan oblak']],
  ['O', 'starts', 'Club paraguayo de Asunción, uno de los más ganadores de su liga', 'Olimpia', ['club olimpia']],
  ['O', 'contains', 'Estadio de Roma, casa de la Lazio y de la Roma', 'Olímpico', ['estadio olimpico', 'stadio olimpico']],
  ['P', 'def', 'Único jugador con tres Mundiales ganados', 'Pelé', ['pele', 'edson arantes do nascimento']],
  ['P', 'starts', 'Defensor italiano que jugó toda su carrera en el Milan', 'Paolo Maldini', ['maldini']],
  ['P', 'contains', 'Tiro desde el punto blanco, a once metros del arco', 'Penal', ['penalti']],
  ['Q', 'def', 'País que organizó el Mundial de 2022', 'Qatar', ['catar']],
  ['Q', 'starts', 'Club argentino de la Provincia de Buenos Aires, del sur del Gran Buenos Aires', 'Quilmes', ['club quilmes']],
  ['R', 'def', 'Club madrileño de Chamartín, dueño del Santiago Bernabéu', 'Real Madrid', ['madrid', 'real']],
  ['R', 'starts', 'Club argentino de Avellaneda, apodado La Academia', 'Racing Club', ['racing']],
  ['R', 'contains', 'Lateral brasileño del Real Madrid, famoso por sus tiros libres', 'Roberto Carlos', ['roberto']],
  ['S', 'def', 'Selección europea de Xhaka y Shaqiri', 'Suiza', ['switzerland']],
  ['S', 'starts', 'Defensor español del Real Madrid, con cuatro Champions', 'Sergio Ramos', ['ramos']],
  ['S', 'contains', 'Torneo de primera división italiano', 'Serie A', ['liga italiana', 'serie a italiana']],
  ['T', 'def', 'Tarjeta que expulsa al jugador del campo', 'Tarjeta roja', ['roja']],
  ['T', 'starts', 'Lanzamiento que se patea desde una falta', 'Tiro libre', ['tiro libre', 'libre']],
  ['T', 'contains', 'Club londinense de camiseta blanca, con Harry Kane en el ataque', 'Tottenham', ['spurs', 'tottenham hotspur']],
  ['U', 'def', 'País campeón del mundo en 1930 y 1950', 'Uruguay', ['uruguai']],
  ['U', 'starts', 'Confederación que agrupa a las selecciones europeas', 'UEFA', ['uefa']],
  ['U', 'contains', 'Club de Lima apodado la U', 'Universitario', ['universitario de deportes']],
  ['V', 'def', 'Delantero brasileño del Real Madrid', 'Vinícius Júnior', ['vinicius', 'vinicius junior', 'vinicius jr']],
  ['V', 'starts', 'Club español de Mestalla, de camiseta naranja y negra', 'Valencia', ['valencia cf']],
  ['V', 'contains', 'Club de Castellón apodado el Submarino Amarillo', 'Villarreal', ['villarreal cf']],
  ['W', 'def', 'Estadio de Londres, casa de la selección inglesa', 'Wembley', []],
  ['W', 'starts', 'Club inglés de Wolverhampton, apodado Wolves', 'Wolverhampton', ['wolves', 'wolverhampton wanderers']],
  ['W', 'contains', 'Técnico francés que dirigió al Arsenal durante 22 años', 'Wenger', ['arsene wenger']],
  ['X', 'def', 'Español del Barcelona conocido como el Maestro', 'Xavi', ['xavi hernandez', 'xavi hernández']],
  ['X', 'starts', 'Delantero suizo que jugó en Bayern, Inter y Liverpool', 'Xherdan Shaqiri', ['shaqiri']],
  ['X', 'contains', 'Mediocampista español campeón del Mundo en 2010', 'Xabi Alonso', ['alonso', 'xabi']],
  ['Y', 'def', 'Portero ruso, Balón de Oro en 1963', 'Yashin', ['lev yashin']],
  ['Y', 'starts', 'Club japonés de la ciudad de Yokohama', 'Yokohama Marinos', ['marinos', 'yokohama']],
  ['Y', 'contains', 'Selección europea que se dividió en varios países en los noventa', 'Yugoslavia', ['yugoslavia']],
  ['Z', 'def', 'Francés del Real Madrid, el 10 que ganó el Mundial 1998', 'Zidane', ['zinedine zidane']],
  ['Z', 'starts', 'Club aragonés del estadio La Romareda', 'Zaragoza', ['real zaragoza', 'zaragoza cf']],
  ['Z', 'contains', 'Delantero sueco que marcó más de 500 goles en su carrera', 'Zlatan Ibrahimović', ['zlatan', 'ibrahimovic']],
];

export const PASAPALABRA_BANK: BankEntry[] = (() => {
  const counters: Record<string, number> = {};
  return ROWS.map(([letter, kind, clue, answer, aliases = []]) => {
    counters[letter] = (counters[letter] ?? 0) + 1;
    return { id: `${letter}${counters[letter]}`, letter, kind, clue, answer, aliases };
  });
})();
