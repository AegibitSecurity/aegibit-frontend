import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

// Stable at module load time — Capacitor static import is always ready.
const IS_NATIVE = Capacitor.isNativePlatform();

export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    () => IS_NATIVE || (typeof window !== 'undefined' && window.innerWidth <= breakpoint)
  );

  useEffect(() => {
    // Native Android/iOS is always treated as mobile — no resize listener needed.
    if (IS_NATIVE) {
      setIsMobile(true);
      return;
    }
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    setIsMobile(mq.matches);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);

  return isMobile;
}
