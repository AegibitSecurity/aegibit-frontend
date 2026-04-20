import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import MobileTopBar from './components/MobileTopBar';
import LoginPage from './components/LoginPage';
import ToastContainer from './components/ToastContainer';
import AppError from './components/AppError';
import { themeManager } from './utils/theme';
import { useIsMobile } from './hooks/useIsMobile';
import { isAuthenticated, getUser, logout, fetchCurrentUser, clearToken, fetchDashboard, getOrgId } from './api';

const OptimizedDecisionEngine = lazy(() => import('./components/OptimizedDecisionEngine'));
const OptimizedCreateDeal     = lazy(() => import('./components/OptimizedCreateDeal'));
const DealStream              = lazy(() => import('./components/DealStream'));
const ApprovalQueue           = lazy(() => import('./components/ApprovalQueue'));
const UploadPricing           = lazy(() => import('./components/UploadPricing'));
const UserManagement          = lazy(() => import('./components/UserManagement'));

function ViewLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', gap: '0.75rem', fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{
        width: 28, height: 28,
        border: '2px solid #1e293b', borderTop: '2px solid #3b82f6',
        borderRadius: '50%', animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <span style={{ color: '#64748b', fontSize: '0.875rem' }}>Loading…</span>
    </div>
  );
}

// ── Minimal full-screen spinner shown only while token is being validated ─────
function AuthLoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f172a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1rem',
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{
        width: 40,
        height: 40,
        border: '3px solid #1e293b',
        borderTop: '3px solid #3b82f6',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <span style={{ color: '#64748b', fontSize: '0.875rem' }}>Verifying session…</span>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(false);
  // isAuthLoading: true until we know whether the stored token is still valid.
  // Prevents briefly showing the dashboard with an expired token.
  const [isAuthLoading, setIsAuthLoading] = useState(isAuthenticated());
  const [sessionExpiredMsg, setSessionExpiredMsg] = useState('');
  const [activeView, setActiveView] = useState('dashboard');
  const [pendingCount, setPendingCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const isMobile = useIsMobile();
  const currentUser = getUser();
  const isAdmin = currentUser?.role === 'ADMIN';

  // ── On mount: validate the stored token with a real API call ─────────────
  useEffect(() => {
    if (!isAuthenticated()) {
      setIsAuthLoading(false);
      return;
    }

    fetchCurrentUser()
      .then(() => setAuthed(true))
      .catch(() => {
        clearToken();
        setAuthed(false);
        // Only show the message if token was present — means it expired, not a fresh visit
        setSessionExpiredMsg('Your session has expired. Please sign in again.');
      })
      .finally(() => setIsAuthLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = useCallback((user) => {
    setSessionExpiredMsg('');
    setAuthed(true);
    setActiveView('dashboard');
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    setAuthed(false);
    setSessionExpiredMsg('');
  }, []);

  // Listen for auth expiry triggered by any API call mid-session
  useEffect(() => {
    const onExpired = () => {
      setAuthed(false);
      setSessionExpiredMsg('Your session has expired. Please sign in again.');
    };
    window.addEventListener('authExpired', onExpired);
    return () => window.removeEventListener('authExpired', onExpired);
  }, []);

  // Multi-tab logout sync — if another tab clears the user record, log out here too
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'aegibit_user' && !e.newValue) {
        setAuthed(false);
        setSessionExpiredMsg('You were signed out in another tab.');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const handleOrgChange    = useCallback(() => setRefreshKey(k => k + 1), []);
  const handleDealCreated  = useCallback(() => setRefreshKey(k => k + 1), []);
  const handleWsDealEvent  = useCallback(() => setRefreshKey(k => k + 1), []);
  const handleWsTaskEvent  = useCallback(() => setRefreshKey(k => k + 1), []);

  // Poll pending count on mobile (Sidebar handles this on desktop)
  useEffect(() => {
    if (!authed || !isMobile) return;
    function poll() {
      if (!getOrgId()) return;
      fetchDashboard()
        .then((s) => setPendingCount(s.pending_gm_tasks + s.pending_director_tasks))
        .catch(() => {});
    }
    poll();
    const id = setInterval(poll, 15000);
    return () => clearInterval(id);
  }, [authed, isMobile]);

  const handleNavigate = useCallback((view) => {
    setActiveView(view);
    setSidebarOpen(false);
  }, []);

  useEffect(() => {
    const up = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

  useEffect(() => { themeManager.init(); }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── Auth loading — show spinner until token validation completes ──────────
  if (isAuthLoading) return <AuthLoadingScreen />;

  // ── Not authenticated — show login with optional expiry message ───────────
  if (!authed) {
    return (
      <>
        <AppError />
        <LoginPage onLogin={handleLogin} sessionMessage={sessionExpiredMsg} />
      </>
    );
  }

  function renderView() {
    switch (activeView) {
      case 'dashboard': return <OptimizedDecisionEngine key={`dashboard-${refreshKey}`} />;
      case 'create':    return <OptimizedCreateDeal key={`create-${refreshKey}`} onDealCreated={handleDealCreated} />;
      case 'stream':    return <DealStream key={`stream-${refreshKey}`} />;
      case 'approval':  return <ApprovalQueue key={`approval-${refreshKey}`} />;
      case 'upload':    return <UploadPricing key={`upload-${refreshKey}`} />;
      case 'users':     return isAdmin
        ? <UserManagement key={`users-${refreshKey}`} />
        : <OptimizedDecisionEngine key={`dashboard-${refreshKey}`} />;
      default:          return <OptimizedDecisionEngine key={`dashboard-${refreshKey}`} />;
    }
  }

  return (
    <div className="app-layout">
      {!isOnline && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: '#f59e0b', color: '#000', textAlign: 'center',
          padding: '8px 16px', fontSize: '13px', fontWeight: 600,
          letterSpacing: '0.01em',
        }}>
          You are offline — changes will not be saved
        </div>
      )}
      {/* Global non-blocking error banner */}
      <AppError />

      {/* Desktop/Tablet: sidebar + hamburger (hidden on mobile via CSS) */}
      <button
        className="mobile-menu-btn"
        onClick={() => setSidebarOpen(o => !o)}
        aria-label="Toggle menu"
        id="mobile-menu-toggle"
      >
        {sidebarOpen ? '✕' : '☰'}
      </button>
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />
      {!isMobile && (
        <Sidebar
          activeView={activeView}
          onNavigate={handleNavigate}
          pendingCount={pendingCount}
          onOrgChange={handleOrgChange}
          onPendingCount={setPendingCount}
          isOpen={sidebarOpen}
          onLogout={handleLogout}
          isAdmin={isAdmin}
        />
      )}

      <main className="app-main" id="main-content">
        {/* Mobile-only top bar (org switcher, notifications, profile) */}
        {isMobile && (
          <MobileTopBar
            onOrgChange={handleOrgChange}
            onLogout={handleLogout}
            onPendingCount={setPendingCount}
          />
        )}
        <Suspense fallback={<ViewLoader />}>
          {renderView()}
        </Suspense>
      </main>

      {/* Mobile-only bottom navigation */}
      {isMobile && (
        <BottomNav
          activeView={activeView}
          onNavigate={handleNavigate}
          pendingCount={pendingCount}
        />
      )}

      {/* Real-time WebSocket toast notifications */}
      <ToastContainer
        onDealEvent={handleWsDealEvent}
        onTaskEvent={handleWsTaskEvent}
      />
    </div>
  );
}
