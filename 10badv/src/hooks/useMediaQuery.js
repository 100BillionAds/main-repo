'use client';

import { useState, useEffect } from 'react';

/**
 * 미디어 쿼리를 사용하는 커스텀 훅
 * @param {string} query - 미디어 쿼리 문자열
 * @returns {boolean} 매치 여부
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (event) => setMatches(event.matches);
    media.addEventListener('change', listener);

    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

/**
 * 반응형 브레이크포인트를 확인하는 커스텀 훅
 */
export function useBreakpoint() {
  const isMobile = useMediaQuery('(max-width: 639px)');
  const isTablet = useMediaQuery('(min-width: 640px) and (max-width: 1023px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  return {
    isMobile,
    isTablet,
    isDesktop,
  };
}
