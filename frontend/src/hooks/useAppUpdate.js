/**
 * useAppUpdate — Google Play In-App Updates integration.
 *
 * Behaviour:
 *   - On mount and every time the app returns to foreground, checks Play Store
 *     for a newer version.
 *   - FLEXIBLE update (normal): download runs silently in the background.
 *     When the download finishes, `updateReady` becomes true → the caller
 *     shows a banner with an "Install now" button.
 *   - IMMEDIATE update (Play Store marks it mandatory): a full-screen system
 *     overlay is shown automatically; user cannot dismiss it.
 *   - On web / non-Android, all checks are silent no-ops so the same hook
 *     works in the browser during development.
 *
 * Usage:
 *   const { updateReady, installUpdate } = useAppUpdate();
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

const isNative = () => Capacitor.isNativePlatform();

let AppUpdate;
let CapApp;

async function loadPlugins() {
  if (!isNative()) return false;
  try {
    const [au, ca] = await Promise.all([
      import('@capawesome/capacitor-app-update'),
      import('@capacitor/app'),
    ]);
    AppUpdate = au.AppUpdate;
    CapApp    = ca.App;
    return true;
  } catch {
    return false;
  }
}

export function useAppUpdate() {
  const [updateReady, setUpdateReady] = useState(false);
  const pluginsReady = useRef(false);

  const checkForUpdate = useCallback(async () => {
    if (!pluginsReady.current) return;
    try {
      const info = await AppUpdate.getAppUpdateInfo();

      // updateAvailability: 1 = unknown, 2 = available, 3 = in-progress, 4 = not available
      if (info.updateAvailability !== 2) return;

      // immediateUpdateAllowed → Play Store flags this as a mandatory update
      if (info.immediateUpdateAllowed) {
        await AppUpdate.performImmediateUpdate();
        return;
      }

      // flexibleUpdateAllowed → download silently, notify when ready
      if (info.flexibleUpdateAllowed) {
        await AppUpdate.startFlexibleUpdate();
      }
    } catch {
      // Silently ignore — update checks are best-effort
    }
  }, []);

  useEffect(() => {
    let stateListener;

    (async () => {
      pluginsReady.current = await loadPlugins();
      if (!pluginsReady.current) return;

      // Listen for the flexible download completing
      await AppUpdate.addListener('onFlexibleUpdateStateChange', (state) => {
        // installStatus: 5 = DOWNLOADED (ready to install)
        if (state.installStatus === 5) setUpdateReady(true);
      });

      // Check on mount
      await checkForUpdate();

      // Re-check every time the user returns to the app
      stateListener = await CapApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) checkForUpdate();
      });
    })();

    return () => {
      stateListener?.remove?.();
      if (pluginsReady.current) {
        AppUpdate.removeAllListeners?.();
      }
    };
  }, [checkForUpdate]);

  const installUpdate = useCallback(async () => {
    if (!pluginsReady.current) return;
    try {
      await AppUpdate.completeFlexibleUpdate();
    } catch {
      // App will restart automatically if the call fails mid-way
    }
  }, []);

  return { updateReady, installUpdate };
}
