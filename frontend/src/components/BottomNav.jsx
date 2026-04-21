import { getUser } from '../api';

const IcoDashboard = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
  </svg>
);
const IcoCreate = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);
const IcoStream = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <circle cx="3" cy="6" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="3" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="3" cy="18" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);
const IcoApprove = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 12l2 2 4-4" />
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
  </svg>
);
const IcoUpload = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);
const IcoUsers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export default function BottomNav({ activeView, onNavigate, pendingCount }) {
  const currentUser = getUser();
  const isAdmin = currentUser?.role === 'ADMIN';

  const navItems = [
    { id: 'dashboard', label: 'Home',   Icon: IcoDashboard },
    { id: 'create',    label: 'Deal',   Icon: IcoCreate },
    { id: 'stream',    label: 'Stream', Icon: IcoStream },
    { id: 'approval',  label: 'Queue',  Icon: IcoApprove, badge: pendingCount },
    { id: 'upload',    label: 'Upload', Icon: IcoUpload },
    ...(isAdmin ? [{ id: 'users', label: 'Users', Icon: IcoUsers }] : []),
  ];

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {navItems.map(({ id, label, Icon, badge }) => {
        const isActive = activeView === id;
        return (
          <button
            key={id}
            className={`bottom-nav-item${isActive ? ' active' : ''}`}
            onClick={() => onNavigate(id)}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
          >
            {/* Orange pill indicator at top when active */}
            <span className="bn-pill" aria-hidden="true" />

            <span className="bottom-nav-icon-wrap">
              <Icon />
              {badge > 0 && (
                <span className="bottom-nav-badge">{badge > 99 ? '99+' : badge}</span>
              )}
            </span>
            <span className="bottom-nav-label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
