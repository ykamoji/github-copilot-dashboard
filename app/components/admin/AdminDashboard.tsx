'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, User } from '../auth/AuthContext';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const { token, user, logout } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;

    if (user.role !== 'admin') {
      router.push('/');
      return;
    }

    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/admin/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.status === 401 || res.status === 403) {
          logout();
          return;
        }

        const json = await res.json();
        if (json.status === 'success') {
          setUsers(json.data);
        } else {
          setError(json.message);
        }
      } catch (err) {
        setError('Failed to load users.');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [user, token, router, logout]);

  if (!user || user.role !== 'admin') return null;

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
            onClick={() => router.push('/')}
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
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.user_id} onClick={() => router.push(`/admin/user/${u.user_id}?username=${u.name}`)}>
                    <td style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`admin-badge ${u.role}`}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{u.user_id}</td>
                    <td>{new Date((u as any).created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="admin-state">No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
