import { fonts } from '../../theme';
import { getPublicAssetUrl, JERSEY_TEMPLATE_PATH } from '../../lib/assets';
import { jerseyColors, readableOn } from '../../lib/countryVisuals';

const templateUrl = getPublicAssetUrl(JERSEY_TEMPLATE_PATH);

interface JerseyPhotoProps {
  countryName: string | null;
  lastName: string;
  number: number;
  width?: number;
}

/** One neutral jersey product photo (uploaded once, see `assets.ts`),
 * recolored per nationality with a `mix-blend-mode: multiply` tint — which
 * preserves the photo's real fabric shading/folds instead of flattening it —
 * with name/number composited on top. Never regenerates a new image. */
function tintBackground(primary: string, secondary: string, pattern: 'solid' | 'stripes' | 'checker'): string {
  if (pattern === 'stripes') {
    return `repeating-linear-gradient(90deg, ${primary} 0 14px, ${secondary} 14px 28px)`;
  }
  if (pattern === 'checker') {
    // Classic two-gradient checkerboard trick, tiled at 24x24px.
    return (
      `repeating-conic-gradient(${primary} 0% 25%, ${secondary} 0% 50%) 0 0/24px 24px`
    );
  }
  return primary;
}

export function JerseyPhoto({ countryName, lastName, number, width = 200 }: JerseyPhotoProps) {
  const { primary, secondary, pattern } = countryName
    ? jerseyColors(countryName)
    : { primary: '#2fae4c', secondary: '#ffffff', pattern: 'solid' as const };
  const textColor = readableOn(primary);
  const height = Math.round(width * 1.3);

  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        overflow: 'hidden',
        borderRadius: 10,
        background: '#141416',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <img
        src={templateUrl}
        alt=""
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center 22%',
        }}
      />
      <div
        style={{ position: 'absolute', inset: 0, background: tintBackground(primary, secondary, pattern), mixBlendMode: 'multiply' }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 32%, transparent 35%, #0a0a0c 92%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '36%',
          textAlign: 'center',
          fontFamily: fonts.display,
          fontSize: width * 0.065,
          letterSpacing: 1,
          color: textColor,
          textShadow: '0 1px 3px rgba(0,0,0,0.5)',
        }}
      >
        {lastName}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '42%',
          textAlign: 'center',
          fontFamily: fonts.display,
          fontSize: width * 0.22,
          color: textColor,
          textShadow: '0 2px 6px rgba(0,0,0,0.5)',
        }}
      >
        {number}
      </div>
    </div>
  );
}
