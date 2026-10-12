/**
 * Who goes up for auction. Sorting by national-team caps alone kept pulling
 * in names few people know, so the lots now come from a curated list of
 * headliners instead. Every id below was looked up in the `players` table
 * (name + nationality checked), not guessed.
 *
 * Legends (Pelé, Maradona, Zidane…) are not listed here: they live in the
 * table under ids >= 900,000,000 — see scripts/import-legends.mjs.
 */

export const STAR_IDS: number[] = [
  // Goalkeepers
  17259, // Manuel Neuer
  108390, // Thibaut Courtois
  105470, // Alisson
  238223, // Ederson
  111873, // Emiliano Martínez
  74857, // Marc-André ter Stegen
  121483, // Jan Oblak
  17965, // Hugo Lloris
  79422, // Keylor Navas
  315858, // Gianluigi Donnarumma
  182906, // Mike Maignan
  59377, // David de Gea
  207834, // Yassine Bounou
  58088, // Fernando Muslera
  29559, // Guillermo Ochoa
  44058, // Wojciech Szczęsny
  5023, // Gianluigi Buffon
  3979, // Iker Casillas
  5658, // Petr Čech
  40423, // Claudio Bravo

  // Defenders
  25557, // Sergio Ramos
  139208, // Virgil van Dijk
  164770, // Raphaël Varane
  29241, // Thiago Silva
  69751, // Jordi Alba
  314353, // Trent Alexander-Arnold
  398073, // Achraf Hakimi
  258004, // Rúben Dias
  401530, // Éder Militão
  86202, // Antonio Rüdiger
  93128, // Kalidou Koulibaly
  424204, // Alphonso Davies
  339808, // Theo Hernández
  181767, // Marquinhos
  480762, // Lisandro Martínez
  355915, // Cristian Romero
  54781, // Nicolás Otamendi
  138927, // Dani Carvajal
  95424, // Kyle Walker
  186590, // John Stones
  177907, // Harry Maguire
  59016, // David Alaba
  39728, // Mats Hummels
  495666, // William Saliba
  326031, // Matthijs de Ligt
  250845, // José María Giménez
  183288, // Luke Shaw
  475959, // Joško Gvardiol
  411975, // Jules Koundé
  344695, // Dayot Upamecano
  315853, // Alessandro Bastoni
  182712, // João Cancelo
  616341, // Nuno Mendes
  503482, // Kim Min-jae
  14132, // Pepe
  18944, // Gerard Piqué
  15951, // Dani Alves
  29260, // Giorgio Chiellini
  39983, // Leonardo Bonucci
  2219, // Philipp Lahm
  26485, // Jérôme Boateng
  54928, // Diego Godín
  7594, // Carles Puyol
  1161, // Javier Zanetti
  3160, // John Terry
  3235, // Rio Ferdinand

  // Midfielders
  27992, // Luka Modrić
  88755, // Kevin De Bruyne
  16306, // Casemiro
  225083, // N'Golo Kanté
  122153, // Paul Pogba
  65230, // Sergio Busquets
  326330, // Frenkie de Jong
  683840, // Pedri
  581678, // Jude Bellingham
  369081, // Federico Valverde
  357565, // Rodri
  241641, // Bernardo Silva
  240306, // Bruno Fernandes
  357662, // Declan Rice
  161056, // Joshua Kimmich
  53622, // İlkay Gündoğan
  102017, // Jorginho
  255942, // Nicolò Barella
  397033, // Sandro Tonali
  316264, // Martin Ødegaard
  406635, // Phil Foden
  255901, // Rodrigo De Paul
  648195, // Enzo Fernández
  534033, // Alexis Mac Allister
  88103, // James Rodríguez
  37666, // Arturo Vidal
  646740, // Gavi
  413112, // Aurélien Tchouaméni
  640428, // Eduardo Camavinga
  153084, // Leon Goretzka
  32467, // Ivan Rakitić
  156617, // Marcelo Brozović
  111455, // Granit Xhaka
  444523, // Lucas Paquetá
  69633, // Christian Eriksen
  598577, // Florian Wirtz
  580195, // Jamal Musiala
  68290, // Neymar
  520624, // Bruno Guimarães
  293385, // Dani Olmo
  31909, // Toni Kroos
  7600, // Andrés Iniesta
  7476, // Xabi Alonso
  5817, // Andrea Pirlo
  3109, // Steven Gerrard
  3163, // Frank Lampard
  3397, // Paul Scholes
  3139, // David Beckham
  2514, // Bastian Schweinsteiger
  35664, // Mesut Özil
  4673, // Wesley Sneijder
  3366, // Kaká
  19981, // Javier Mascherano

  // Forwards
  28003, // Lionel Messi
  8198, // Cristiano Ronaldo
  342229, // Kylian Mbappé
  418560, // Erling Haaland
  38253, // Robert Lewandowski
  18922, // Karim Benzema
  44352, // Luis Suárez
  132098, // Harry Kane
  148455, // Mohamed Salah
  200512, // Sadio Mané
  371998, // Vinícius Júnior
  125781, // Antoine Griezmann
  96341, // Romelu Lukaku
  48280, // Edinson Cavani
  39152, // Radamel Falcao
  45320, // Ángel Di María
  206050, // Paulo Dybala
  406625, // Lautaro Martínez
  576024, // Julián Álvarez
  134425, // Raheem Sterling
  258923, // Marcus Rashford
  288230, // Ousmane Dembélé
  243714, // Kingsley Coman
  357164, // Rafael Leão
  401923, // Victor Osimhen
  82442, // Olivier Giroud
  412363, // Rodrygo
  411295, // Raphinha
  378710, // Richarlison
  131789, // Roberto Firmino
  40433, // Alexis Sánchez
  58358, // Thomas Müller
  167850, // Memphis Depay
  502670, // Khvicha Kvaratskhelia
  341092, // Federico Chiesa
  546543, // Darwin Núñez
  315779, // Christian Pulisic
  480692, // Luis Díaz
  937958, // Lamine Yamal
  58864, // Pierre-Emerick Aubameyang
  171424, // Riyad Mahrez
  363205, // Gabriel Jesus
  433177, // Bukayo Saka
  203460, // Jack Grealish
  309400, // Kai Havertz
  349066, // Alexander Isak
  357498, // Dušan Vlahović
  91845, // Son Heung-min
  3455, // Zlatan Ibrahimović
  26399, // Sergio Agüero
  39381, // Gareth Bale
  50202, // Eden Hazard
  39153, // Gonzalo Higuaín
  4276, // Carlos Tevez
  3924, // Didier Drogba
  4257, // Samuel Eto'o
  3332, // Wayne Rooney
  1397, // Michael Owen
  4360, // Arjen Robben
  4380, // Robin van Persie
  22068, // Franck Ribéry
  10, // Miroslav Klose
  5958, // Francesco Totti
  7767, // Fernando Torres
  7980, // David Villa
];

/**
 * The dataset only carries national-team caps for players who are still
 * active, so retired icons come through with 0. These are their real career
 * caps (hand-checked), used only for the auction so a Casillas or an
 * Iniesta scores like the legend he is.
 */
export const CAPS_OVERRIDE: Record<number, number> = {
  5023: 176, // Buffon
  3979: 167, // Casillas
  5658: 124, // Čech
  40423: 150, // Bravo
  14132: 141, // Pepe
  18944: 102, // Piqué
  15951: 126, // Dani Alves
  29260: 117, // Chiellini
  39983: 121, // Bonucci
  2219: 113, // Lahm
  26485: 76, // Boateng
  54928: 161, // Godín
  7594: 100, // Puyol
  1161: 145, // Zanetti
  3160: 78, // Terry
  3235: 81, // Ferdinand
  31909: 114, // Kroos
  7600: 131, // Iniesta
  7476: 114, // Xabi Alonso
  5817: 116, // Pirlo
  3109: 114, // Gerrard
  3163: 106, // Lampard
  3397: 66, // Scholes
  3139: 115, // Beckham
  2514: 121, // Schweinsteiger
  35664: 92, // Özil
  4673: 134, // Sneijder
  3366: 92, // Kaká
  19981: 147, // Mascherano
  3455: 122, // Ibrahimović
  26399: 101, // Agüero
  39381: 111, // Bale
  50202: 126, // Hazard
  39153: 75, // Higuaín
  4276: 76, // Tevez
  3924: 105, // Drogba
  4257: 118, // Eto'o
  3332: 120, // Rooney
  1397: 89, // Owen
  4360: 96, // Robben
  4380: 102, // van Persie
  22068: 81, // Ribéry
  10: 137, // Klose
  5958: 58, // Totti
  7767: 110, // Fernando Torres
  7980: 98, // David Villa
};

/** National teams that keep producing household names — the fallback pool
 * (used only if the curated list runs dry for a position) draws from these. */
export const STAR_NATIONS = [
  'Argentina',
  'Brazil',
  'France',
  'Germany',
  'Spain',
  'Italy',
  'England',
  'Portugal',
  'Netherlands',
  'Uruguay',
  'Belgium',
  'Croatia',
];
