import { getUser } from '../api';

const IcoDashboard = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
  </svg>
);
const IcoCreate = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);
const IcoStream = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" /><circle cx="3" cy="6" r="1" fill="currentColor" />
    <circle cx="3" cy="12" r="1" fill="currentColor" /><circle cx="3" cy="18" r="1" fill="currentColor" />
  </svg>
);
const IcoApprove = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IcoUpload = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
  </svg>
);
const IcoUsers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export default function BottomNav({ activeView, onNavigate, pendingCount }) {
  const currentUser = getUser();
  const isAdmin = currentUser?.role === 'ADMIN';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', Icon: IcoDashboard },
    { id: 'create',    label: 'New Deal',  Icon: IcoCreate },
    { id: 'stream',    label: 'Stream',    Icon: IcoStream },
    { id: 'approval',  label: 'Queue',     Icon: IcoApprove, badge: pendingCount },
    { id: 'upload',    label: 'Upload',    Icon: IcoUpload },
    ...(isAdmin ? [{ id: 'users', label: 'Users', Icon: IcoUsers }] : []),
  ];

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {navItems.map(({ id, label, Icon, badge }) => (
        <button
          key={id}
          className={`bottom-nav-item${activeView === id ? ' active' : ''}`}
          onClick={() => onNavigate(id)}
          aria-label={label}
          aria-current={activeView === id ? 'page' : undefined}
        >
          <span className="bottom-nav-icon-wrap">
            <Icon />
            {badge > 0 && (
              <span className="bottom-nav-badge">{badge > 99 ? '99+' : badge}</span>
            )}
          </span>
          <span className="bottom-nav-label">{label}</span>
        </button>
      ))}
    </nav>
  );
}
