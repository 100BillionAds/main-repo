'use client';

import { useState, useCallback } from 'react';

/**
 * 토글 상태를 관리하는 커스텀 훅
 * @param {boolean} initialValue - 초기값
 * @returns {Array} [value, toggle, setValue]
 */
export function useToggle(initialValue = false) {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => {
    setValue((v) => !v);
  }, []);

  return [value, toggle, setValue];
}
