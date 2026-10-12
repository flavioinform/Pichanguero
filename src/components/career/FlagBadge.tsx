import { useState } from 'react';
import { flagImageUrl } from '../../lib/countryVisuals';

interface FlagBadgeProps {
  countryName: string;
  width?: 20 | 40 | 80;
}

export function FlagBadge({ countryName, width = 20 }: FlagBadgeProps) {
  const url = flagImageUrl(countryName, width);
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    return (
      <span
        style={{
          display: 'inline-block',
          width: width * 0.75,
          height: width * 0.5,
          background: 'rgba(255,255,255,0.15)',
          borderRadius: 2,
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <img
      src={url}
      alt=""
      onError={() => setFailed(true)}
      style={{ width: width * 0.75, height: width * 0.5, objectFit: 'cover', borderRadius: 2, flexShrink: 0, display: 'block' }}
    />
  );
}
