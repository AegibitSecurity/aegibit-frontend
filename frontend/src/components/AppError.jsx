/**
 * AppError — global non-blocking error banner.
 *
 * Listens for `appError` custom events dispatched via dispatchAppError()
 * in api.js. Renders a fixed banner that does NOT replace the app UI,
 * auto-dismisses after 6 seconds, stacks up to 3 messages, and deduplicates
 * the same error type within a 3-second window.
 *
 * Event shape: { detail: { type: string, message: string } }
 *
 * Types:
 *   session_expired    → amber
 *   server_unreachable → red
 *   server_error       → red
 *   network_down       → red
 *   permission_denied  → amber
 *   (default)          → indigo
 */

import { useState, useEffect, useCallback, useRef } from 'react';

const TYPE_CONFIG = {
  server_unreachable: { bg: '#ef4444', icon: '⚡', label: 'Server unreachable' },
  server_error:       { bg: '#ef4444', icon: '⚠',  label: 'Server error'       },
  network_down:       { bg: '#ef4444', icon: '📡', label: 'No connection'       },
  session_expired:    { bg: '#f59e0b', icon: '🔒', label: 'Session expired'    },
  permission_denied:  { bg: '#f59e0b', icon: '🚫', label: 'Access denied'      },
};

const DEFAULT_CONFIG = { bg: '#6366f1', icon: 'ℹ', label: 'Notice' };

const DEDUP_WINDOW_MS = 3000;

let _idCounter = 0;

export default function AppError() {
  const [banners, setBanners] = useState([]);
  const timers   = useRef({});
  const lastSeen = useRef({}); // type → timestamp of last shown banner

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setBanners(prev => prev.filter(b => b.id !== id));
  }, []);

  useEffect(() => {
    const handler = (e) => {
      const { type = 'generic', message = 'Something went wrong.' } = e.detail || {};

      // Suppress duplicate error types within the dedup window
      const now = Date.now();
      if (lastSeen.current[type] && now - lastSeen.current[type] < DEDUP_WINDOW_MS) return;
      lastSeen.current[type] = now;

      const id = ++_idCounter;
      setBanners(prev => {
        // Cap at 3 concurrent banners (drop oldest)
        const next = prev.length >= 3 ? prev.slice(1) : prev;
        return [...next, { id, type, message }];
      });
      timers.current[id] = setTimeout(() => dismiss(id), 6000);
    };

    window.addEventListener('appError', handler);
    return () => window.removeEventListener('appError', handler);
  }, [dismiss]);

  // Cleanup on unmount
  useEffect(() => {
    return () => Object.values(timers.current).forEach(clearTimeout);
  }, []);

  if (!banners.length) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        maxWidth: '360px',
        width: 'calc(100vw - 2rem)',
        pointerEvents: 'none', // don't block clicks underneath
      }}
    >
      {banners.map(({ id, type, message }) => {
        const cfg = TYPE_CONFIG[type] || DEFAULT_CONFIG;
        return (
          <div
            key={id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.625rem',
              padding: '0.75rem 1rem',
              background: cfg.bg,
              color: '#fff',
              borderRadius: '8px',
              fontSize: '0.8125rem',
              fontWeight: 500,
              lineHeight: 1.4,
              boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
              pointerEvents: 'all',
              fontFamily: 'Inter, system-ui, sans-serif',
              animation: 'ae-slide-in 0.2s ease-out',
            }}
          >
            <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: '0.05rem' }}>
              {cfg.icon}
            </span>
            <span style={{ flex: 1 }}>{message}</span>
            <button
              onClick={() => dismiss(id)}
              aria-label="Dismiss"
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.8)',
                cursor: 'pointer',
                fontSize: '1rem',
                lineHeight: 1,
                padding: '0 0 0 0.25rem',
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>
        );
      })}
      <style>{`
        @keyframes ae-slide-in {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>
    </div>
  );
}
