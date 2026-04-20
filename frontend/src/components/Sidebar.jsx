import { useState, useEffect } from 'react';
import { fetchOrganizations, getOrgId, setOrgId, getRole, getUser, fetchDashboard } from '../api';
import NotificationBell from './NotificationBell';

export default function Sidebar({ activeView, onNavigate, pendingCount, onOrgChange, onPendingCount, isOpen, onLogout, isAdmin }) {
  const [orgs, setOrgs] = useState([]);
  const [currentOrg, setCurrentOrg] = useState(getOrgId());
  const currentUser = getUser();
  const currentRole = currentUser?.role || getRole();

  // Load orgs and auto-select first
  useEffect(() => {
    fetchOrganizations()
      .then((data) => {
        setOrgs(data);
        if (!getOrgId() && data.length > 0) {
          setOrgId(data[0].id);
          localStorage.setItem('aegibit_org_name', data[0].name);
          setCurrentOrg(data[0].id);
          window.dispatchEvent(new CustomEvent('orgChanged', {
            detail: { orgId: data[0].id, orgName: data[0].name }
          }));
          onOrgChange?.(data[0].id);
        } else if (getOrgId()) {
          const current = data.find(o => o.id === getOrgId());
          if (current) {
            localStorage.setItem('aegibit_org_name', current.name);
            window.dispatchEvent(new CustomEvent('orgChanged', {
              detail: { orgId: current.id, orgName: current.name }
            }));
          }
        }
      })
      .catch(console.error);
  }, []);

  // Poll dashboard to keep pendingCount accurate
  useEffect(() => {
    function refresh() {
      const orgId = getOrgId();
      if (!orgId) return;
      fetchDashboard()
        .then((s) => onPendingCount?.(s.pending_gm_tasks + s.pending_director_tasks))
        .catch(console.error);
    }
    refresh();
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, [onPendingCount, currentOrg]);

  function handleOrgChange(e) {
    const id = e.target.value;
    const org = orgs.find(o => o.id === id);
    setOrgId(id);
    localStorage.setItem('aegibit_org_name', org?.name || '');
    setCurrentOrg(id);
    window.dispatchEvent(new CustomEvent('orgChanged', {
      detail: { orgId: id, orgName: org?.name || '' }
    }));
    onOrgChange?.(id);
  }

  const navItems = [
    { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
    { id: 'create',   icon: '⚡', label: 'Create Deal' },
    { id: 'stream',   icon: '📊', label: 'Deal Stream' },
    { id: 'approval', icon: '✅', label: 'Approvals', badge: pendingCount },
    { id: 'upload',   icon: '📁', label: 'Upload Pricing' },
    ...(isAdmin ? [{ id: 'users', icon: '👥', label: 'Users' }] : []),
  ];

  const roleLabel = {
    ADMIN: '⚙️ Admin',
    DIRECTOR: '🏛️ Director',
    GM: '👔 GM',
    SALES: '👤 Sales',
  };

  return (
    <aside className="sidebar" id="sidebar">
      <div className="sidebar-logo">
        <h1>AEGIBIT</h1>
        <span>Flow Engine</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <div
            key={item.id}
            id={`nav-${item.id}`}
            className={`nav-item ${activeView === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onNavigate(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
            {item.badge > 0 && (
              <span className="nav-badge">{item.badge}</span>
            )}
          </div>
        ))}
      </nav>

      {/* Notification Bell */}
      <NotificationBell onPendingCount={onPendingCount} />

      {/* Current User Info */}
      <div className="user-info-panel">
        <div className="user-email">{currentUser?.email || 'Unknown'}</div>
        <div className="user-role-badge">{roleLabel[currentRole] || currentRole}</div>
      </div>

      {/* Org Switcher */}
      <div className="org-switcher">
        <label>Organization</label>
        <select
          id="org-switcher-select"
          value={currentOrg || ''}
          onChange={handleOrgChange}
          disabled={orgs.length === 0}
        >
          {orgs.length === 0 ? (
            <option value="">Loading...</option>
          ) : (
            orgs.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))
          )}
        </select>
      </div>

      {/* Logout Button */}
      <button className="logout-btn" onClick={onLogout}>
        🚪 Sign Out
      </button>
    </aside>
  );
}
