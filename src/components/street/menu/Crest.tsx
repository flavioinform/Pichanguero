import type { CrestDesign, CrestShape, CrestSymbol } from '../../../lib/street/team';

/** El contorno de cada forma de escudo, en un cuadro de 100 x 120. */
const SHAPES: Record<CrestShape, string> = {
  escudo: 'M10 8 H90 V62 C90 90 70 108 50 116 C30 108 10 90 10 62 Z',
  circulo: 'M50 6 A48 48 0 1 1 49.9 6 Z',
  rombo: 'M50 4 L96 60 L50 116 L4 60 Z',
  hexagono: 'M27 6 H73 L97 60 L73 114 H27 L3 60 Z',
};

/** Los símbolos, centrados en (50, 60). */
function star(cx: number, cy: number, outer: number, inner: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`);
  }
  return pts.join(' ');
}

const SYMBOL_PATHS: Record<Exclude<CrestSymbol, 'estrella' | 'balon'>, string> = {
  rayo: 'M58 28 L36 64 H50 L42 94 L66 54 H52 Z',
  corona: 'M30 80 L28 42 L41 58 L50 36 L59 58 L72 42 L70 80 Z',
  llama: 'M50 28 C57 44 70 50 66 70 C64 82 57 90 50 90 C42 90 34 82 34 70 C34 58 44 54 44 42 C47 46 49 48 50 28 Z',
  luna: 'M62 32 A28 28 0 1 0 62 88 A21 21 0 1 1 62 32 Z',
  cruz: 'M43 32 H57 V52 H77 V68 H57 V88 H43 V68 H23 V52 H43 Z',
};

interface CrestProps {
  crest: CrestDesign;
  size?: number;
  title?: string;
}

/** El escudo del equipo: forma, símbolo y dos colores. Se dibuja igual en el editor, el resumen y el marcador. */
export function Crest({ crest, size = 96, title }: CrestProps) {
  const { shape, symbol, color1, color2 } = crest;
  return (
    <svg width={size} height={(size * 120) / 100} viewBox="0 0 100 120" role={title ? 'img' : 'presentation'} aria-label={title} style={{ display: 'block', overflow: 'visible' }}>
      <path d={SHAPES[shape]} fill={color1} stroke="#0b0d11" strokeWidth={7} strokeLinejoin="round" />
      <path d={SHAPES[shape]} fill="none" stroke={color2} strokeWidth={3} strokeLinejoin="round" transform="translate(50 60) scale(0.86) translate(-50 -60)" />
      {symbol === 'estrella' && <polygon points={star(50, 62, 27, 11)} fill={color2} stroke="#0b0d11" strokeWidth={3} strokeLinejoin="round" />}
      {symbol === 'balon' && (
        <g stroke="#0b0d11" strokeWidth={3} strokeLinejoin="round">
          <circle cx={50} cy={60} r={24} fill={color2} />
          <polygon points={star(50, 60, 11, 11).split(' ').filter((_, i) => i % 2 === 0).join(' ')} fill={color1} />
        </g>
      )}
      {symbol !== 'estrella' && symbol !== 'balon' && <path d={SYMBOL_PATHS[symbol]} fill={color2} stroke="#0b0d11" strokeWidth={3} strokeLinejoin="round" />}
    </svg>
  );
}
