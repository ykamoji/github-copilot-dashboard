'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { API_BASE } from '@/api';

export interface User {
  user_id: string;
  name: string;
  email: string;
  role: 'user' | 'admin' | 'viewer';
  created_at: string;
  ai_token_budget?: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for saved token on mount
    const savedToken = localStorage.getItem('copilot_auth_token');
    
    if (savedToken) {
      validateSession(savedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const validateSession = async (savedToken: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/session`, {
        headers: {
          'Authorization': `Bearer ${savedToken}`
        }
      });
      
      const json = await res.json();
      
      if (res.ok && json.status === 'success') {
        setToken(savedToken);
        setUser(json.user);
      } else {
        // Token invalid or expired
        localStorage.removeItem('copilot_auth_token');
      }
    } catch (err) {
      console.error('Failed to validate session', err);
    } finally {
      setIsLoading(false);
    }
  };

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('copilot_auth_token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    if (token) {
      try {
        await fetch(`${API_BASE}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (err) {
        console.error('Logout failed', err);
      }
    }
    
    localStorage.removeItem('copilot_auth_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}
