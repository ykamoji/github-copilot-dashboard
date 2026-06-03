'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Dashboard from '@/components/dashboard/Dashboard';
import { useAuth } from '@/components/auth/AuthContext';

export default function MainPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000', color: '#71717a', fontFamily: 'var(--font-family, sans-serif)' }}>
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000', color: '#71717a', fontFamily: 'var(--font-family, sans-serif)' }}>
        Redirecting...
      </div>
    );
  }

  return <Dashboard />;
}
