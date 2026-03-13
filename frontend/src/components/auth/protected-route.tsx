'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuthStore } from '@/store/auth-store';
import { apiClient } from '@/lib/api-client';
import { getDashboardPath } from '@/lib/role-routing';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** If provided, the route is only accessible to users with this role (or superuser). */
  requiredRole?: 'owner' | 'manager' | 'tenant' | 'superuser';
}

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated, setUser, setTokens, logout, user } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    if (!_hasHydrated) return;

    async function initAuth() {
      // Already authenticated — fetch current user to keep store fresh
      if (isAuthenticated) {
        try {
          const res = await apiClient.get('/users/me');
          setUser(res.data);
          // Enforce role guard if required
          if (requiredRole) {
            const u = res.data;
            const hasAccess =
              u.is_superuser ||
              (requiredRole === 'superuser' && u.is_superuser) ||
              (requiredRole !== 'superuser' && u.roles?.includes(requiredRole));
            if (!hasAccess) {
              router.push(getDashboardPath(u));
              return;
            }
          }
        } catch {
          // access token invalid — fall through to refresh attempt below
        }
        setIsInitializing(false);
        return;
      }

      // Not authenticated — check if a refresh token is stored
      const refreshToken =
        typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;

      if (!refreshToken) {
        router.push('/login');
        setIsInitializing(false);
        return;
      }

      // Try to exchange the refresh token for a new token pair
      try {
        const refreshRes = await axios.post(
          `${baseURL}/auth/refresh/`,
          { refresh_token: refreshToken },
          { params: { set_cookie: false } }
        );
        const { access, refresh } = refreshRes.data;
        setTokens(access, refresh);

        // Fetch user with the new access token
        const userRes = await apiClient.get('/users/me', {
          headers: { Authorization: `Bearer ${access}` },
        });
        setUser(userRes.data);
        // Enforce role guard if required
        if (requiredRole) {
          const u = userRes.data;
          const hasAccess =
            u.is_superuser ||
            (requiredRole === 'superuser' && u.is_superuser) ||
            (requiredRole !== 'superuser' && u.roles?.includes(requiredRole));
          if (!hasAccess) {
            router.push(getDashboardPath(u));
            return;
          }
        }
      } catch {
        logout();
        router.push('/login');
      } finally {
        setIsInitializing(false);
      }
    }

    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_hasHydrated]);

  if (!_hasHydrated || isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return <>{children}</>;
}

