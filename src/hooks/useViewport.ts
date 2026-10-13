import { useEffect, useState } from 'react';

export type ViewportSize = 'mobile' | 'tablet' | 'desktop';

function sizeFor(width: number): ViewportSize {
  if (width < 640) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

/** Tamaño de pantalla actual, para adaptar el diseño a celular, tablet o escritorio. */
export function useViewport(): ViewportSize {
  const [size, setSize] = useState<ViewportSize>(() => sizeFor(window.innerWidth));

  useEffect(() => {
    const onResize = () => setSize(sizeFor(window.innerWidth));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return size;
}
