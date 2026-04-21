import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

/**
 * useBackButton — Android hardware back-button handler.
 *
 * Behaviour:
 *   - Any screen other than 'dashboard' → navigate back to dashboard.
 *   - On dashboard (the root screen) → minimize the app (go to background).
 *     This matches the Android convention: back from root = minimize, not kill.
 *
 * No-op on web / iOS — safe to use everywhere.
 */
export function useBackButton(activeView, onNavigate) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let handle;
    App.addListener('backButton', () => {
      if (activeView !== 'dashboard') {
        onNavigate('dashboard');
      } else {
        App.minimizeApp();
      }
    }).then((h) => { handle = h; });

    return () => { handle?.remove?.(); };
  }, [activeView, onNavigate]);
}
