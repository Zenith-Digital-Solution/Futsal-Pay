'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { apiClient } from '@/lib/api-client';
import { getDashboardPath } from '@/lib/role-routing';
import { Loader2 } from 'lucide-react';

/**
 * Landing page for social OAuth callbacks.
 * The backend redirects here after a successful social login with
 * access and refresh tokens as query params (when set_cookie=false).
 * Usage: /auth-callback?access=TOKEN&refresh=TOKEN
 */
function AuthCallbackInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setTokens, setUser } = useAuthStore();

  useEffect(() => {
    const access = searchParams.get('access');
    const refresh = searchParams.get('refresh');
    const error = searchParams.get('error');

    if (error) {
      router.replace(`/login?error=${encodeURIComponent(error)}`);
      return;
    }

    if (access && refresh) {
      setTokens(access, refresh);
      // Fetch user to determine role-based dashboard
      apiClient
        .get('/users/me', { headers: { Authorization: `Bearer ${access}` } })
        .then((res) => {
          setUser(res.data);
          router.replace(getDashboardPath(res.data));
        })
        .catch(() => {
          router.replace('/dashboard');
        });
    } else {
      router.replace('/login?error=oauth_failed');
    }
  }, [searchParams, setTokens, setUser, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-gray-500 text-sm">Completing sign-in…</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <AuthCallbackInner />
    </Suspense>
  );
}

