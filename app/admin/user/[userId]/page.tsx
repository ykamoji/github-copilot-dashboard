'use client';

import { use, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Dashboard from '@/components/dashboard/Dashboard';
import { useAuth } from '@/components/auth/AuthContext';
import './page.css';

export default function AdminUserDashboard({ params }: { params: Promise<{ userId: string }> }) {

  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();

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
  }, [user, isLoading, router]);

  // Unwrap params using React.use
  const { userId } = use(params);
  const userName = searchParams.get('username') || userId;

  if (isLoading || !user || user.role !== 'admin') {
    return null;
  }

  return (
    <div>
      <div className="user-admin-header">
        <button
          onClick={() => router.push('/admin')}
          className="user-admin-back-btn"
        >
          ← Back to Users
        </button>
        <span style={{ color: 'var(--text-muted)' }}>Viewing user: <strong style={{ color: 'var(--text-primary)' }}>{userName}</strong></span>
      </div>
      <Dashboard targetUserId={userId} />
    </div>
  );
}
