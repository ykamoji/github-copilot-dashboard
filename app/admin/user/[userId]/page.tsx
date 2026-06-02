'use client';

import { use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Dashboard from '../../../components/dashboard/Dashboard';
import { useAuth } from '../../../components/auth/AuthContext';

export default function AdminUserDashboard({ params }: { params: Promise<{ userId: string }> }) {

  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  // Unwrap params using React.use
  const { userId } = use(params);
  const userName = searchParams.get('username') || userId;

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div>
      <div style={{ padding: '16px 24px', background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center' }}>
        <button
          onClick={() => router.push('/admin')}
          style={{ background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', marginRight: '16px' }}
        >
          ← Back to Users
        </button>
        <span style={{ color: 'var(--text-muted)' }}>Viewing user: <strong style={{ color: 'var(--text-primary)' }}>{userName}</strong></span>
      </div>
      <Dashboard targetUserId={userId} />
    </div>
  );
}
