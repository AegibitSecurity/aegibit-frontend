/**
 * ToastContainer — real-time toast notifications from WebSocket events.
 *
 * Renders a stack of auto-dismissing toast popups in the top-right corner.
 * Each toast shows the event title, message, and a severity accent bar.
 *
 * Usage: Place <ToastContainer /> at the App root. Call addToast() via ref or
 *        pass events from useWebSocket → handleWsToast().
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { useWebSocket, DEAL_EVENTS, WS_EVENTS } from '../hooks/useWebSocket';
import CelebrationAnimation from './CelebrationAnimation';
import { soundManager, playNotification, playSuccess, playError } from '../utils/sound';

const TOAST_DURATION = 5000; // 5 seconds
const MAX_TOASTS = 5;

const EVENT_ICONS = {
  deal_created: '⚡',
  deal_approved: '✅',
  deal_rejected: '❌',
  status_changed: '🔺',
  task_update: '📋',
  pricing_uploaded: '📊',
};

const SEVERITY_MAP = {
  INFO: 'success',
  WARNING: 'warning',
  CRITICAL: 'error',
};

let toastIdCounter = 0;

export default function ToastContainer({ onDealEvent, onTaskEvent }) {
  const [toasts, setToasts] = useState([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const timersRef = useRef({});

  // Remove a toast by ID
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
  }, []);

  // Add a new toast
  const addToast = useCallback((toast) => {
    const id = ++toastIdCounter;
    const newToast = { id, ...toast, exiting: false };

    // Play sound based on toast variant
    if (toast.variant === 'error') {
      playError();
    } else if (toast.variant === 'success' && toast.title?.toLowerCase().includes('approv')) {
      playSuccess();
    } else {
      playNotification();
    }

    setToasts((prev) => {
      const next = [newToast, ...prev];
      // Cap at MAX_TOASTS
      if (next.length > MAX_TOASTS) {
        const removed = next.pop();
        if (removed && timersRef.current[removed.id]) {
          clearTimeout(timersRef.current[removed.id]);
          delete timersRef.current[removed.id];
        }
      }
      return next;
    });

    // Auto-dismiss after TOAST_DURATION
    timersRef.current[id] = setTimeout(() => {
      // Start exit animation
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
      );
      // Remove after animation
      setTimeout(() => removeToast(id), 300);
    }, TOAST_DURATION);

    return id;
  }, [removeToast]);

  // Handle WebSocket events → create toasts + trigger refresh callbacks
  const handleWsEvent = useCallback(
    (event) => {
      // Skip protocol messages
      if (!event.type || event.type === 'connected' || event.type === 'ping' || event.type === 'pong') {
        return;
      }

      const icon = EVENT_ICONS[event.type] || '📌';
      const variant = SEVERITY_MAP[event.severity] || 'success';

      // Trigger celebration and success sound on deal approval events
      if (
        event.type === 'deal_approved' ||
        event.type === 'DEAL_APPROVED' ||
        event.type === 'GM_APPROVED' ||
        event.type === 'DIRECTOR_APPROVED' ||
        event.type === 'DEAL_AUTO_APPROVED'
      ) {
        setShowCelebration(true);
        playSuccess();
      }

      // Create toast for real events
      if (event.title || event.message) {
        addToast({
          title: event.title || event.event_type?.replace(/_/g, ' ') || 'Event',
          message: event.message || '',
          variant,
          icon,
          dealId: event.deal?.id,
        });
      }

      // Trigger deal refresh callback
      if (DEAL_EVENTS.includes(event.type)) {
        onDealEvent?.(event);
      }

      // Trigger task refresh callback
      if (event.type === WS_EVENTS.TASK_UPDATE || DEAL_EVENTS.includes(event.type)) {
        onTaskEvent?.(event);
      }
    },
    [addToast, onDealEvent, onTaskEvent]
  );

  useWebSocket(handleWsEvent);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach(clearTimeout);
    };
  }, []);

  return (
    <>
      {/* Flying cars celebration on deal approval */}
      <CelebrationAnimation
        show={showCelebration}
        onComplete={() => setShowCelebration(false)}
      />

      {toasts.length > 0 && (
        <div className="toast-container" id="toast-container">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`toast toast-${toast.variant} ${toast.exiting ? 'toast-exit' : ''}`}
              onClick={() => removeToast(toast.id)}
              role="alert"
            >
              <div className="toast-accent" />
              <div className="toast-content">
                <div className="toast-header">
                  <span className="toast-icon">{toast.icon}</span>
                  <span className="toast-title">{toast.title}</span>
                  <button
                    className="toast-close"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeToast(toast.id);
                    }}
                    aria-label="Dismiss"
                  >
                    ×
                  </button>
                </div>
                {toast.message && (
                  <div className="toast-body">{toast.message}</div>
                )}
              </div>
              {/* Progress bar */}
              <div className="toast-progress">
                <div
                  className="toast-progress-bar"
                  style={{ animationDuration: `${TOAST_DURATION}ms` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
