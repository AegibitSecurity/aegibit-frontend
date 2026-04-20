import { useState, useEffect } from 'react';

// Capacitor sets this when running as a native app.
// We always treat native as mobile regardless of viewport width.
const isNativePlatform = !!(
  typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()
);

export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => {
    if (isNativePlatform) return true;
    return typeof window !== 'undefined' && window.innerWidth <= breakpoint;
  });

  useEffect(() => {
    // Native apps are always "mobile" — no need for a resize listener.
    if (isNativePlatform) return;
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    setIsMobile(mq.matches);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);

  return isMobile;
}
