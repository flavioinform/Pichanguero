import { useState } from 'react';
import { colors, fonts } from '../../theme';

interface PlayerAvatarProps {
  imageUrl: string | null;
  lastName: string;
  size?: number;
}

/** A real player's photo (see `CareerPlayerState.avatarImageUrl`) used as a
 * one-time stand-in portrait. Falls back to initials if there's no photo or
 * it fails to load, instead of leaving a broken image. */
export function PlayerAvatar({ imageUrl, lastName, size = 96 }: PlayerAvatarProps) {
  const [failed, setFailed] = useState(false);

  if (!imageUrl || failed) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: '#1e1e20',
          border: '1px solid rgba(255,255,255,0.14)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: fonts.display,
          fontSize: size * 0.32,
          color: colors.textSecondary,
          flexShrink: 0,
        }}
      >
        {lastName.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt=""
      onError={() => setFailed(true)}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        objectFit: 'cover',
        border: '1px solid rgba(255,255,255,0.14)',
        flexShrink: 0,
        display: 'block',
      }}
    />
  );
}
