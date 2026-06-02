'use client';

import Dashboard from './components/dashboard/Dashboard';
import LoginPage from './components/auth/LoginPage';
import { useAuth } from './components/auth/AuthContext';

export default function Page() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0e1a', color: '#64748b' }}>
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <Dashboard />;
}
