import { useState, useEffect, useRef } from 'react';
import { fetchOrganizations, getOrgId, setOrgId, getUser, fetchNotifications, markAllNotificationsRead, switchOrg } from '../api';
import { toggleTheme, getEffectiveTheme, onThemeChange } from '../utils/theme';
import { toggleSound, isSoundEnabled } from '../utils/sound';

const IcoChevronDown = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const IcoBell = ({ count }) => (
  <span style={{ position: 'relative', display: 'inline-flex' }}>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
    {count > 0 && (
      <span style={{
        position: 'absolute', top: '-4px', right: '-4px',
        background: '#ef4444', color: 'white', borderRadius: '9999px',
        fontSize: '9px', fontWeight: 700, minWidth: '16px', height: '16px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 3px', lineHeight: 1,
      }}>
        {count > 9 ? '9+' : count}
      </span>
    )}
  </span>
);
const IcoUser = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const IcoLogout = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);
const IcoCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IcoShield = () => (
  <svg width="26" height="30" viewBox="0 0 80 92" fill="none">
    <path d="M40 4L72 16V46C72 66 58 78 40 88C22 78 8 66 8 46V16L40 4Z" fill="#F05228"/>
    <path d="M40 20C40 20 60 28 60 28V48C60 60 52 68 40 74C28 68 20 60 20 48V28Z" fill="white" opacity="0.92"/>
    <path d="M28 36L40 52L52 36V28H28Z" fill="#F05228"/>
    <path d="M52 20C56 22 60 25 60 28L52 28Z" fill="#F05228"/>
  </svg>
);

export default function MobileTopBar({ onOrgChange, onLogout, onPendingCount }) {
  const [orgs, setOrgs] = useState([]);
  const [orgName, setOrgName] = useState(localStorage.getItem('aegibit_org_name') || '');
  const [switchingOrg, setSwitchingOrg] = useState(false);
  const [showOrgSheet, setShowOrgSheet] = useState(false);
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [showNotifSheet, setShowNotifSheet] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isDark, setIsDark] = useState(getEffectiveTheme() === 'dark');
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const currentUser = getUser();

  // Load orgs
  useEffect(() => {
    fetchOrganizations().then(setOrgs).catch(() => {});
  }, []);

  // Load notifications + badge count
  useEffect(() => {
    function load() {
      fetchNotifications()
        .then((data) => {
          setNotifications(data);
          onPendingCount?.(data.filter((n) => n.status === 'UNREAD').length);
        })
        .catch(() => {});
    }
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [onPendingCount]);

  // Listen for org changes (e.g. from desktop sidebar on resize)
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.orgName) setOrgName(e.detail.orgName);
    };
    window.addEventListener('orgChanged', handler);
    return () => window.removeEventListener('orgChanged', handler);
  }, []);

  // Theme changes
  useEffect(() => {
    return onThemeChange((theme) => setIsDark(theme === 'dark'));
  }, []);

  async function handleOrgSelect(org) {
    if (switchingOrg || org.id === getOrgId()) { setShowOrgSheet(false); return; }
    setSwitchingOrg(true);
    try {
      await switchOrg(org.id);
      localStorage.setItem('aegibit_org_name', org.name);
      setOrgName(org.name);
      window.dispatchEvent(new CustomEvent('orgChanged', {
        detail: { orgId: org.id, orgName: org.name },
      }));
      onOrgChange?.(org.id);
    } catch (err) {
      console.error('[OrgSwitch]', err);
    } finally {
      setSwitchingOrg(false);
      setShowOrgSheet(false);
    }
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead().catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, status: 'READ' })));
    onPendingCount?.(0);
  }

  const unreadCount = notifications.filter((n) => n.status === 'UNREAD').length;

  return (
    <>
      <header className="mobile-topbar">
        {/* Brand */}
        <div className="mobile-topbar-brand">
          <IcoShield />
          <span>AEGIBIT</span>
        </div>

        {/* Org pill */}
        <button
          className="mobile-topbar-org"
          onClick={() => setShowOrgSheet(true)}
          aria-label="Switch organization"
        >
          <span className="mobile-topbar-org-name">{orgName || 'Select Org'}</span>
          <IcoChevronDown />
        </button>

        {/* Right actions */}
        <div className="mobile-topbar-actions">
          <button
            className="mobile-topbar-icon-btn"
            onClick={() => setShowNotifSheet(true)}
            aria-label={`Notifications — ${unreadCount} unread`}
          >
            <IcoBell count={unreadCount} />
          </button>
          <button
            className="mobile-topbar-icon-btn"
            onClick={() => setShowProfileSheet(true)}
            aria-label="Profile"
          >
            <IcoUser />
          </button>
        </div>
      </header>

      {/* Org Sheet */}
      {showOrgSheet && (
        <div className="mobile-sheet-overlay" onClick={() => setShowOrgSheet(false)}>
          <div className="mobile-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-sheet-handle" />
            <div className="mobile-sheet-title">Switch Organization</div>
            {switchingOrg ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 14 }}>
                Switching…
              </div>
            ) : orgs.map((org) => (
              <button
                key={org.id}
                className={`mobile-sheet-item${getOrgId() === org.id ? ' active' : ''}`}
                onClick={() => handleOrgSelect(org)}
              >
                <span>{org.name}</span>
                {getOrgId() === org.id && <IcoCheck />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Notifications Sheet */}
      {showNotifSheet && (
        <div className="mobile-sheet-overlay" onClick={() => setShowNotifSheet(false)}>
          <div className="mobile-sheet mobile-sheet-tall" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-sheet-handle" />
            <div className="mobile-sheet-header-row">
              <div className="mobile-sheet-title" style={{ marginBottom: 0 }}>Notifications</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  className="mobile-sheet-icon-btn"
                  onClick={() => { toggleTheme(); setIsDark(getEffectiveTheme() === 'dark'); }}
                  title="Toggle theme"
                >
                  {isDark ? '🌙' : '☀️'}
                </button>
                <button
                  className="mobile-sheet-icon-btn"
                  onClick={() => setSoundOn(toggleSound())}
                  title="Toggle sound"
                >
                  {soundOn ? '🔊' : '🔇'}
                </button>
                {unreadCount > 0 && (
                  <button className="mobile-sheet-text-btn" onClick={handleMarkAllRead}>
                    Mark all read
                  </button>
                )}
              </div>
            </div>
            <div className="mobile-sheet-notif-list">
              {notifications.length === 0 ? (
                <div className="mobile-sheet-empty">No notifications yet</div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`mobile-sheet-notif-item${n.status === 'UNREAD' ? ' unread' : ''}`}
                  >
                    <div className="mobile-sheet-notif-title">
                      {n.payload?.title || n.event_type.replace(/_/g, ' ')}
                    </div>
                    {n.payload?.message && (
                      <div className="mobile-sheet-notif-msg">{n.payload.message}</div>
                    )}
                    <div className="mobile-sheet-notif-time">
                      {n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                    {n.status === 'UNREAD' && <div className="mobile-sheet-notif-dot" />}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profile Sheet */}
      {showProfileSheet && (
        <div className="mobile-sheet-overlay" onClick={() => setShowProfileSheet(false)}>
          <div className="mobile-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-sheet-handle" />
            <div className="mobile-sheet-user-card">
              <div className="mobile-sheet-user-email">{currentUser?.email}</div>
              <div className="mobile-sheet-user-role">{currentUser?.role}</div>
            </div>
            <button
              className="mobile-sheet-item danger"
              onClick={() => { setShowProfileSheet(false); onLogout(); }}
            >
              <IcoLogout />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
