import { colors } from '../theme';
// Transfermarkt's `countries.country_name` values (all 124 rows currently in
// the imported dataset) mapped to ISO 3166-1 alpha-2 codes, for flag images.
// Kept separate from jersey colors below since every country needs a flag,
// but only a curated subset has hand-picked kit colors.
const COUNTRY_ISO2: Record<string, string> = {
  Albania: 'al',
  Algeria: 'dz',
  Andorra: 'ad',
  Argentina: 'ar',
  Armenia: 'am',
  Australia: 'au',
  Austria: 'at',
  Azerbaijan: 'az',
  Bangladesh: 'bd',
  Belarus: 'by',
  Belgium: 'be',
  Belize: 'bz',
  Bhutan: 'bt',
  Bolivia: 'bo',
  'Bosnia-Herzegovina': 'ba',
  Brazil: 'br',
  'Brunei Darussalam': 'bn',
  Bulgaria: 'bg',
  Cambodia: 'kh',
  Canada: 'ca',
  Chile: 'cl',
  China: 'cn',
  'Chinese Taipei': 'tw',
  Colombia: 'co',
  Comoros: 'km',
  'Costa Rica': 'cr',
  Croatia: 'hr',
  Cyprus: 'cy',
  'Czech Republic': 'cz',
  Denmark: 'dk',
  'Dominican Republic': 'do',
  Ecuador: 'ec',
  Egypt: 'eg',
  'El Salvador': 'sv',
  England: 'gb-eng',
  Estonia: 'ee',
  Ethiopia: 'et',
  'Faroe Islands': 'fo',
  Fiji: 'fj',
  Finland: 'fi',
  France: 'fr',
  Georgia: 'ge',
  Germany: 'de',
  Ghana: 'gh',
  Gibraltar: 'gi',
  Greece: 'gr',
  Guatemala: 'gt',
  Honduras: 'hn',
  Hongkong: 'hk',
  Hungary: 'hu',
  Iceland: 'is',
  India: 'in',
  Indonesia: 'id',
  Iran: 'ir',
  Iraq: 'iq',
  Ireland: 'ie',
  Israel: 'il',
  Italy: 'it',
  Jamaica: 'jm',
  Japan: 'jp',
  Jordan: 'jo',
  Kazakhstan: 'kz',
  'Korea, South': 'kr',
  Kosovo: 'xk',
  Kyrgyzstan: 'kg',
  Laos: 'la',
  Latvia: 'lv',
  Lebanon: 'lb',
  Libya: 'ly',
  Lithuania: 'lt',
  Luxembourg: 'lu',
  Malaysia: 'my',
  Maldives: 'mv',
  Malta: 'mt',
  Mexico: 'mx',
  Moldova: 'md',
  Montenegro: 'me',
  Morocco: 'ma',
  Myanmar: 'mm',
  Netherlands: 'nl',
  'New Zealand': 'nz',
  Nicaragua: 'ni',
  Nigeria: 'ng',
  'North Macedonia': 'mk',
  'Northern Ireland': 'gb-nir',
  Norway: 'no',
  Oman: 'om',
  Panama: 'pa',
  Paraguay: 'py',
  Peru: 'pe',
  Philippines: 'ph',
  Poland: 'pl',
  Portugal: 'pt',
  'Puerto Rico': 'pr',
  Qatar: 'qa',
  Romania: 'ro',
  Russia: 'ru',
  'San Marino': 'sm',
  'Saudi Arabia': 'sa',
  Scotland: 'gb-sct',
  Senegal: 'sn',
  Serbia: 'rs',
  Singapore: 'sg',
  Slovakia: 'sk',
  Slovenia: 'si',
  'South Africa': 'za',
  Spain: 'es',
  'Sri Lanka': 'lk',
  Sweden: 'se',
  Switzerland: 'ch',
  Tajikistan: 'tj',
  Thailand: 'th',
  'Timor-Leste': 'tl',
  Tunisia: 'tn',
  Türkiye: 'tr',
  Uganda: 'ug',
  Ukraine: 'ua',
  'United Arab Emirates': 'ae',
  'United States': 'us',
  Uruguay: 'uy',
  Uzbekistan: 'uz',
  Venezuela: 've',
  Vietnam: 'vn',
  Wales: 'gb-wls',
};

export type JerseyPattern = 'solid' | 'stripes' | 'checker';

interface JerseyVisual {
  primary: string;
  secondary: string;
  pattern: JerseyPattern;
}

/** Hand-picked kit colors (and, for a few iconic ones, the real pattern —
 * Argentina's vertical stripes, Croatia's checkerboard) for the football
 * nations most likely to come up. Deliberately approximate ("casi oficial"),
 * not a pixel-accurate reproduction of any specific licensed kit — the
 * colors/pattern are public facts about national team kits, not a copy of
 * a manufacturer's actual template. Anything missing falls back to a
 * deterministic solid color derived from the country name. */
const JERSEY_VISUALS: Record<string, JerseyVisual> = {
  Argentina: { primary: '#75aadb', secondary: '#ffffff', pattern: 'stripes' },
  Croatia: { primary: '#ff0000', secondary: '#ffffff', pattern: 'checker' },
  Brazil: { primary: '#ffdf00', secondary: '#009639', pattern: 'solid' },
  Uruguay: { primary: '#75aadb', secondary: '#ffffff', pattern: 'solid' },
  Chile: { primary: '#d52b1e', secondary: '#ffffff', pattern: 'solid' },
  Colombia: { primary: '#ffcd00', secondary: '#003087', pattern: 'solid' },
  Paraguay: { primary: '#d52b1e', secondary: '#ffffff', pattern: 'stripes' },
  Peru: { primary: '#d91023', secondary: '#ffffff', pattern: 'solid' },
  Ecuador: { primary: '#ffcd00', secondary: '#003da5', pattern: 'solid' },
  Bolivia: { primary: '#007934', secondary: '#ffcd00', pattern: 'solid' },
  Venezuela: { primary: '#cf142b', secondary: '#ffcc00', pattern: 'solid' },
  Mexico: { primary: '#006847', secondary: '#ffffff', pattern: 'solid' },
  'United States': { primary: '#3c3b6e', secondary: '#ffffff', pattern: 'solid' },
  Canada: { primary: '#ff0000', secondary: '#ffffff', pattern: 'solid' },
  Spain: { primary: '#c60b1e', secondary: '#ffc400', pattern: 'solid' },
  Portugal: { primary: '#006600', secondary: '#ff0000', pattern: 'solid' },
  Germany: { primary: '#ffffff', secondary: '#000000', pattern: 'solid' },
  France: { primary: '#002395', secondary: '#ffffff', pattern: 'solid' },
  Italy: { primary: '#0066b2', secondary: '#ffffff', pattern: 'solid' },
  England: { primary: '#ffffff', secondary: '#c8102e', pattern: 'solid' },
  Netherlands: { primary: '#ff6600', secondary: '#ffffff', pattern: 'solid' },
  Belgium: { primary: '#e30613', secondary: '#000000', pattern: 'solid' },
  Switzerland: { primary: '#d52b1e', secondary: '#ffffff', pattern: 'solid' },
  Austria: { primary: '#ed2939', secondary: '#ffffff', pattern: 'solid' },
  Poland: { primary: '#ffffff', secondary: '#dc143c', pattern: 'solid' },
  Serbia: { primary: '#c6363c', secondary: '#ffffff', pattern: 'solid' },
  Denmark: { primary: '#c60c30', secondary: '#ffffff', pattern: 'solid' },
  Sweden: { primary: '#006aa7', secondary: '#fecc02', pattern: 'solid' },
  Norway: { primary: '#ba0c2f', secondary: '#ffffff', pattern: 'solid' },
  Wales: { primary: '#c8102e', secondary: '#ffffff', pattern: 'solid' },
  Scotland: { primary: '#003d87', secondary: '#ffffff', pattern: 'solid' },
  Ireland: { primary: '#169b62', secondary: '#ffffff', pattern: 'solid' },
  Ukraine: { primary: '#ffd500', secondary: '#005bbb', pattern: 'solid' },
  Türkiye: { primary: '#e30a17', secondary: '#ffffff', pattern: 'solid' },
  Greece: { primary: '#0d5eaf', secondary: '#ffffff', pattern: 'solid' },
  Russia: { primary: '#ffffff', secondary: '#0039a6', pattern: 'solid' },
  'Czech Republic': { primary: '#ffffff', secondary: '#d7141a', pattern: 'solid' },
  Hungary: { primary: '#ce2939', secondary: '#ffffff', pattern: 'solid' },
  Romania: { primary: '#ffcd00', secondary: '#002b7f', pattern: 'solid' },
  Morocco: { primary: '#c1272d', secondary: '#006233', pattern: 'solid' },
  Senegal: { primary: '#00853f', secondary: '#fdef42', pattern: 'solid' },
  Nigeria: { primary: '#ffffff', secondary: '#008751', pattern: 'solid' },
  Ghana: { primary: '#ffffff', secondary: '#ce1126', pattern: 'solid' },
  Egypt: { primary: '#ce1126', secondary: '#ffffff', pattern: 'solid' },
  Algeria: { primary: '#ffffff', secondary: '#006233', pattern: 'solid' },
  Tunisia: { primary: '#e70013', secondary: '#ffffff', pattern: 'solid' },
  'South Africa': { primary: '#007a4d', secondary: '#ffb81c', pattern: 'solid' },
  Japan: { primary: '#ffffff', secondary: '#002395', pattern: 'solid' },
  'Korea, South': { primary: '#ffffff', secondary: '#c60c30', pattern: 'solid' },
  Australia: { primary: '#ffcd00', secondary: '#00843d', pattern: 'solid' },
  'Saudi Arabia': { primary: '#006c35', secondary: '#ffffff', pattern: 'solid' },
  Qatar: { primary: '#8a1538', secondary: '#ffffff', pattern: 'solid' },
  China: { primary: '#de2910', secondary: '#ffde00', pattern: 'solid' },
  Iran: { primary: '#ffffff', secondary: '#239f40', pattern: 'solid' },
};

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const FALLBACK_PALETTE: { primary: string; secondary: string }[] = [
  { primary: '#2f6fae', secondary: '#ffffff' },
  { primary: '#ae2f2f', secondary: '#ffffff' },
  { primary: '#2fae4c', secondary: '#0a0a0c' },
  { primary: '#aa8b2f', secondary: '#ffffff' },
  { primary: '#6b2fae', secondary: '#ffffff' },
  { primary: '#2fa0ae', secondary: '#0a0a0c' },
];

export function jerseyColors(countryName: string): JerseyVisual {
  const known = JERSEY_VISUALS[countryName];
  if (known) return known;
  const fallback = FALLBACK_PALETTE[hashString(countryName) % FALLBACK_PALETTE.length];
  return { ...fallback, pattern: 'solid' };
}

/** Public flag image URL (flagcdn.com, no key required), or null when the
 * country isn't one of the 124 in the imported dataset. */
export function flagImageUrl(countryName: string, widthPx: 20 | 40 | 80 = 40): string | null {
  const iso2 = COUNTRY_ISO2[countryName];
  if (!iso2) return null;
  return `https://flagcdn.com/w${widthPx}/${iso2}.png`;
}

/** Black or white, whichever reads better on top of the given hex color. */
export function readableOn(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? colors.bg : '#ffffff';
}
