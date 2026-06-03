'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, useAuth } from '@/components/auth/AuthContext';
import { useFetchWithCache } from '@/hooks/useFetchWithCache';
import { API_BASE } from '@/api';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const { token, user, logout, isLoading } = useAuth();
  const router = useRouter();
  const fetchWithCache = useFetchWithCache();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Password Reset Modal State
  const [resetModalUser, setResetModalUser] = useState<{ id: string, name: string } | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [confirmPasswordValue, setConfirmPasswordValue] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.push('/');
      return;
    }

    if (user.role !== 'admin') {
      router.push('/main');
      return;
    }

    const fetchUsers = async () => {
      try {
        const json = await fetchWithCache(`${API_BASE}/api/admin/users`);
        if (!json) return; // handled by hook

        if (json.status === 'success') {
          setUsers(json.data);
        } else {
          if (json.message === 'Forbidden') {
            logout();
            return;
          }
          setError(json.message);
        }
      } catch (err) {
        setError('Failed to load users.');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [user, token, router, logout, isLoading, fetchWithCache]);

  if (isLoading || !user || user.role !== 'admin') return null;

  const handleResetPassword = async () => {
    if (!resetModalUser || !newPasswordValue || !confirmPasswordValue) return;

    if (newPasswordValue !== confirmPasswordValue) {
      setResetMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setIsResetting(true);
    setResetMessage(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${resetModalUser.id}/reset-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ new_password: newPasswordValue })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setResetMessage({ type: 'success', text: 'Password reset successfully' });
        setTimeout(() => {
          setResetModalUser(null);
          setNewPasswordValue('');
          setConfirmPasswordValue('');
          setResetMessage(null);
        }, 2000);
      } else {
        setResetMessage({ type: 'error', text: data.message || 'Failed to reset password' });
      }
    } catch (err) {
      setResetMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setIsResetting(false);
    }
  };

  const filteredUsers = users.filter(u =>
    (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            className="admin-back-btn"
            onClick={() => router.push('/main')}
          >
            ← Back to My Dashboard
          </button>
          <div>
            <h1>Admin Panel</h1>
            <p>Manage users and view their Copilot usage</p>
          </div>
        </div>
      </header>

      <div className="admin-card">
        <div className="admin-toolbar">
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="admin-search"
            autoComplete="off"
            name="admin-search-users"
          />
          <div className="admin-count">{filteredUsers.length} Users</div>
        </div>

        {loading && <div className="admin-state">Loading users...</div>}
        {error && <div className="admin-state error">{error}</div>}

        {!loading && !error && (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>User ID</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.user_id} onClick={() => {
                    if (user.user_id !== u.user_id) {
                      router.push(`/admin/user/${u.user_id}?username=${u.name}`)
                    }
                  }}>
                    <td style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`admin-badge ${u.role}`}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{u.user_id}</td>
                    <td>{new Date((u as any).created_at).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="admin-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setResetModalUser({ id: u.user_id, name: u.name || 'User' });
                          setNewPasswordValue('');
                          setConfirmPasswordValue('');
                          setResetMessage(null);
                        }}
                      >
                        Reset Password
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="admin-state">No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {resetModalUser && (
        <div className="admin-modal-overlay" onClick={() => setResetModalUser(null)}>
          <div className="admin-modal-content" onClick={e => e.stopPropagation()}>
            <h3>Reset User Password</h3>
            <p>Enter a new password for <strong>{resetModalUser.name}</strong>.</p>
            <input
              type="password"
              placeholder="New password"
              value={newPasswordValue}
              onChange={e => setNewPasswordValue(e.target.value)}
              className="admin-modal-input"
              autoComplete="new-password"
              name="new_user_password"
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPasswordValue}
              onChange={e => setConfirmPasswordValue(e.target.value)}
              className="admin-modal-input"
              autoComplete="new-password"
              name="confirm_user_password"
            />
            {resetMessage && (
              <div className={`admin-modal-msg ${resetMessage.type}`}>
                {resetMessage.text}
              </div>
            )}
            <div className="admin-modal-actions">
              <button
                className="admin-modal-cancel"
                onClick={() => setResetModalUser(null)}
                disabled={isResetting}
              >
                Cancel
              </button>
              <button
                className="admin-modal-save"
                onClick={handleResetPassword}
                disabled={!newPasswordValue || !confirmPasswordValue || isResetting}
              >
                {isResetting ? 'Saving...' : 'Save Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
