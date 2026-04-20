/**
 * NotificationBell — sidebar bell icon with unread badge and dropdown panel.
 *
 * Uses the unified notification system:
 *  - Fetches from /notifications (includes title + message from backend)
 *  - Uses /notifications/mark-all-read for bulk operations
 *  - Auto-refreshes on WebSocket events (pricing_uploaded, deal events)
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from '../api';
import { useWebSocket } from '../hooks/useWebSocket';
import { toggleSound, isSoundEnabled } from '../utils/sound';
import { toggleTheme, getEffectiveTheme, onThemeChange } from '../utils/theme';

const EVENT_ICONS = {
  DEAL_CREATED: '⚡',
  DEAL_AUTO_APPROVED: '✅',
  GM_APPROVED: '✅',
  GM_ESCALATED: '🔺',
  DIRECTOR_APPROVED: '✅',
  DEAL_REJECTED: '❌',
  PRICING_UPLOADED: '📊',
  // Legacy event types (backward compat)
  DEAL_APPROVED: '✅',
  DEAL_ESCALATED: '🔺',
};

const SEVERITY_COLORS = {
  CRITICAL: '#ef4444',
  WARNING: '#f59e0b',
  INFO: '#6366f1',
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationBell({ onPendingCount }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [isDark, setIsDark] = useState(getEffectiveTheme() === 'dark');
  const panelRef = useRef(null);

  const handleToggleSound = () => {
    const newState = toggleSound();
    setSoundOn(newState);
  };

  const handleToggleTheme = () => {
    toggleTheme();
  };

  // Listen for theme changes
  useEffect(() => {
    const unsubscribe = onThemeChange((theme) => {
      setIsDark(theme === 'dark');
    });
    return unsubscribe;
  }, []);

  const loadNotifications = useCallback(() => {
    fetchNotifications()
      .then((data) => {
        setNotifications(data);
        const unread = data.filter((n) => n.status === 'UNREAD').length;
        onPendingCount?.(unread);
      })
      .catch(console.error);
  }, [onPendingCount]);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Refresh on any WS event
  const handleWsEvent = useCallback(
    (event) => {
      if ([
        'deal_created', 'deal_approved', 'deal_rejected',
        'status_changed', 'pricing_uploaded',
      ].includes(event.type)) {
        loadNotifications();
      }
    },
    [loadNotifications]
  );
  useWebSocket(handleWsEvent);

  async function handleRead(notifId, e) {
    e.stopPropagation();
    await markNotificationRead(notifId);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, status: 'READ' } : n))
    );
    const updated = notifications.map((n) => (n.id === notifId ? { ...n, status: 'READ' } : n));
    onPendingCount?.(updated.filter((n) => n.status === 'UNREAD').length);
  }

  async function markAllRead() {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, status: 'READ' })));
    onPendingCount?.(0);
  }

  const unreadCount = notifications.filter((n) => n.status === 'UNREAD').length;

  /**
   * Render notification content.
   * New backend provides payload.title and payload.message;
   * fall back to legacy event_type label for older notifications.
   */
  function renderNotifContent(n) {
    const icon = EVENT_ICONS[n.event_type] || '📌';
    const title = n.payload?.title || n.event_type.replace(/_/g, ' ');
    const message = n.payload?.message || '';
    const severity = n.payload?.severity || 'INFO';
    const accentColor = SEVERITY_COLORS[severity] || SEVERITY_COLORS.INFO;

    return (
      <>
        <div className="notif-item-label">
          <span style={{ marginRight: 6 }}>{icon}</span>
          {title}
        </div>
        {message && (
          <div className="notif-item-sub" style={{ borderLeft: `2px solid ${accentColor}`, paddingLeft: 8, marginTop: 4 }}>
            {message}
          </div>
        )}
        <div className="notif-item-time">{timeAgo(n.created_at)}</div>
      </>
    );
  }

  return (
    <div className="notif-bell-wrapper" ref={panelRef}>
      <button
        id="notif-bell-btn"
        className="notif-bell-btn"
        onClick={() => setOpen((o) => !o)}
        title="Notifications"
        aria-label={`Notifications — ${unreadCount} unread`}
      >
        <span className="notif-bell-icon">🔔</span>
        <span className="notif-bell-text">Notification</span>
        {unreadCount > 0 && (
          <span className="notif-bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notif-panel" id="notif-panel">
          <div className="notif-panel-header">
            <span>Notifications</span>
            <div className="notif-header-actions">
              <button
                className="notif-theme-toggle"
                onClick={handleToggleTheme}
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? '🌙' : '☀️'}
              </button>
              <button
                className="notif-sound-toggle"
                onClick={handleToggleSound}
                title={soundOn ? 'Mute sounds' : 'Enable sounds'}
                aria-label={soundOn ? 'Mute notification sounds' : 'Enable notification sounds'}
              >
                {soundOn ? '🔊' : '🔇'}
              </button>
              {unreadCount > 0 && (
                <button className="notif-mark-all" onClick={markAllRead}>
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {notifications.length === 0 ? (
            <div className="notif-empty">No notifications yet</div>
          ) : (
            <div className="notif-list">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notif-item ${n.status === 'UNREAD' ? 'unread' : ''}`}
                  onClick={(e) => n.status === 'UNREAD' && handleRead(n.id, e)}
                >
                  {renderNotifContent(n)}
                  {n.status === 'UNREAD' && <div className="notif-unread-dot" />}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
