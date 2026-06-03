'use client';

import { useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthContext';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function useFetchWithCache() {
  const { token, logout } = useAuth();

  const fetchWithCache = useCallback(async (url: string) => {
    if (!token) return null;
    const cacheKey = `dashboard_cache_${url}`;

    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
          return parsed.data;
        }
      }
    } catch (e) {
      console.warn('Session storage read failed', e);
    }

    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 401) {
      logout();
      return null;
    }

    const json = await res.json();
    if (json.status === 'success') {
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({
          timestamp: Date.now(),
          data: json
        }));
      } catch (e) {
        console.warn('Session storage write failed', e);
      }
    }
    return json;
  }, [token, logout]);

  return fetchWithCache;
}
