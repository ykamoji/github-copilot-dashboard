'use client';

import './DashboardHeader.css';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/components/auth/AuthContext';

interface DashboardHeaderProps {
  user: User;
  loading: boolean;
  targetUserId?: string;
  onSync: () => void;
  onLogout: () => void;
}

export default function DashboardHeader({
  user,
  loading,
  targetUserId,
  onSync,
  onLogout,
}: DashboardHeaderProps) {
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <header
      className="dashboard-header"
      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
    >
      {/* Title */}
      <div>
        <h1>Copilot Dashboard</h1>
        <p>AI Credit Usage Analytics {targetUserId ? '(Viewing User)' : ''}</p>
      </div>

      {/* Right-hand actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Sync button */}
        <button
          onClick={onSync}
          disabled={loading}
          className="header-action-btn"
          style={{
            color: loading ? 'var(--accent-fuchsia)' : 'var(--accent-emerald)',
            borderColor: loading ? 'var(--accent-fuchsia)' : 'var(--accent-emerald)',
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width="16" height="16"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginRight: '6px' }}
            className={loading ? 'spin' : ''}
          >
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          {loading ? 'Syncing...' : 'Sync'}
        </button>

        {/* Viewer back button */}
        {user.role === 'viewer' && (
          <button onClick={onLogout} className="header-action-btn">
            ← Back
          </button>
        )}

        {/* Profile dropdown */}
        <div style={{ position: 'relative' }}>
          <div
            onClick={() => setIsDropdownOpen(prev => !prev)}
            style={{
              textAlign: 'right',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              userSelect: 'none',
            }}
          >
            <div>
              <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{user.name}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {user.role}
              </div>
            </div>
            <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>▼</span>
          </div>

          {isDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '8px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                minWidth: '150px',
                zIndex: 100,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
              }}
            >
              <button
                onClick={() => router.push('/profile')}
                className="header-action-btn"
                style={{ width: '100%', justifyContent: 'flex-start' }}
              >
                Profile
              </button>

              {user.role === 'admin' && !targetUserId && (
                <button
                  onClick={() => router.push('/admin')}
                  className="header-action-btn"
                  style={{ width: '100%', justifyContent: 'flex-start' }}
                >
                  Admin Panel
                </button>
              )}

              <button
                onClick={onLogout}
                className="signout-btn"
                style={{ width: '100%', justifyContent: 'flex-start' }}
              >
                <svg
                  viewBox="0 0 24 24" width="16" height="16"
                  stroke="currentColor" strokeWidth="2"
                  fill="none" strokeLinecap="round" strokeLinejoin="round"
                  style={{ marginRight: '6px' }}
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
