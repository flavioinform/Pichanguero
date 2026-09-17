// Maps the country names used across the Gato futbolero pools (gatoPools.ts)
// to ISO 3166-1 alpha-2 codes (flagcdn.com also serves UK subdivisions like
// gb-eng/gb-sct) for flag images. Add an entry here whenever a new country
// is added to EASY/MEDIUM/HARD_COUNTRIES.
const COUNTRY_TO_FLAG_CODE: Record<string, string> = {
  France: 'fr',
  Spain: 'es',
  Serbia: 'rs',
  England: 'gb-eng',
  Japan: 'jp',
  'Czech Republic': 'cz',
  Brazil: 'br',
  Sweden: 'se',
  Türkiye: 'tr',
  Argentina: 'ar',
  Portugal: 'pt',
  Germany: 'de',
  Denmark: 'dk',
  Netherlands: 'nl',
  Croatia: 'hr',
  Poland: 'pl',
  Ukraine: 'ua',
  Belgium: 'be',
  Norway: 'no',
  Italy: 'it',
  'Korea, South': 'kr',
  Romania: 'ro',
  Russia: 'ru',
  'United States': 'us',
  Switzerland: 'ch',
  Colombia: 'co',
  Mexico: 'mx',
  'Saudi Arabia': 'sa',
  Australia: 'au',
  Greece: 'gr',
  Austria: 'at',
  Scotland: 'gb-sct',
  Morocco: 'ma',
  Nigeria: 'ng',
  Uruguay: 'uy',
  'Bosnia-Herzegovina': 'ba',
  Senegal: 'sn',
  "Cote d'Ivoire": 'ci',
  Ghana: 'gh',
  Slovakia: 'sk',
};

export function getFlagUrl(countryName: string): string | null {
  const code = COUNTRY_TO_FLAG_CODE[countryName];
  return code ? `https://flagcdn.com/w80/${code}.png` : null;
}
