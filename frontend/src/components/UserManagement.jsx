/**
 * UserManagement — ADMIN-only user creation and management
 *
 * Features:
 *  - Create users (GM, DIRECTOR, SALES only — never ADMIN)
 *  - View all users in organization
 *  - Activate/deactivate users
 *  - Role dropdown excludes ADMIN
 */
import { useState, useEffect, useCallback } from 'react';
import { fetchUsers, createUser, toggleUserStatus, fetchOrganizations, fetchBranches, getOrgId } from '../api';

const ROLE_OPTIONS = [
  { value: 'SALES', label: 'Sales', icon: '👤' },
  { value: 'GM', label: 'GM', icon: '👔' },
  { value: 'DIRECTOR', label: 'Director', icon: '🏛️' },
];

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create user form
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('SALES');
  const [newOrgId, setNewOrgId] = useState(getOrgId());
  const [newBranchId, setNewBranchId] = useState('');
  const [creating, setCreating] = useState(false);

  const loadUsers = useCallback(() => {
    setLoading(true);
    fetchUsers()
      .then((data) => {
        setUsers(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load users');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadUsers();
    fetchOrganizations().then(setOrgs).catch(console.error);
    fetchBranches()
      .then((data) => {
        setBranches(data);
        const hq = data.find((b) => b.is_head_office);
        if (hq) setNewBranchId(hq.id);
      })
      .catch(console.error);
  }, [loadUsers]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setCreating(true);

    try {
      await createUser({
        email: newEmail,
        password: newPassword,
        role: newRole,
        organization_id: newOrgId,
        branch_id: newBranchId || null,
      });
      setSuccess(`User ${newEmail} created successfully as ${newRole}`);
      setNewEmail('');
      setNewPassword('');
      setNewRole('SALES');
      loadUsers();
    } catch (err) {
      setError(err.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (userId) => {
    try {
      await toggleUserStatus(userId);
      loadUsers();
    } catch (err) {
      setError(err.message || 'Failed to toggle user status');
    }
  };

  const getRoleIcon = (role) => {
    const option = ROLE_OPTIONS.find((r) => r.value === role);
    return option?.icon || '⚙️';
  };

  return (
    <div className="user-management">
      <div className="page-header">
        <h2>👥 User Management</h2>
        <span className="page-subtitle">Create and manage users in your organization</span>
      </div>

      {/* Create User Form */}
      <div className="create-user-card">
        <h3>Create New User</h3>
        <form onSubmit={handleCreateUser} className="create-user-form">
          <div className="form-row">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="user@company.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="Min 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Role</label>
              <select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.icon} {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Branch</label>
              <select value={newBranchId} onChange={(e) => setNewBranchId(e.target.value)}>
                <option value="">No branch assigned</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}{b.is_head_office ? ' (Head Office)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Organization</label>
              <select value={newOrgId} onChange={(e) => setNewOrgId(e.target.value)}>
                {orgs.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {error && <div className="form-error">{error}</div>}
          {success && <div className="form-success">{success}</div>}
          <button type="submit" className="btn-primary" disabled={creating}>
            {creating ? 'Creating...' : 'Create User'}
          </button>
        </form>
      </div>

      {/* User List */}
      <div className="user-list-card">
        <h3>Organization Users</h3>
        {loading ? (
          <div className="loading-state">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="empty-state">No users found</div>
        ) : (
          <div className="user-table-wrapper">
            <table className="user-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Branch</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className={!user.is_active ? 'user-inactive' : ''}>
                    <td>{user.email}</td>
                    <td>
                      <span className="role-badge">{getRoleIcon(user.role)} {user.role}</span>
                    </td>
                    <td>
                      {user.branch_name ? (
                        <span className={`branch-tag${user.branch_name === 'BERHAMPORE' ? ' branch-hq' : ''}`}>
                          {user.branch_name}
                        </span>
                      ) : (
                        <span className="branch-tag branch-none">—</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                    <td>
                      {user.role !== 'ADMIN' && (
                        <button
                          className={`btn-toggle ${user.is_active ? 'deactivate' : 'activate'}`}
                          onClick={() => handleToggleStatus(user.id)}
                        >
                          {user.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
