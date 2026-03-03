'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/hooks/use-auth';
import { useAnalytics } from '@/hooks/use-analytics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { SocialAuthButtons } from '@/components/auth/social-auth-buttons';
import { getDashboardPath, getPostLoginPath } from '@/lib/role-routing';
import { apiClient } from '@/lib/api-client';
import type { OTPLoginResponse } from '@/types';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export function LoginForm() {
  const router = useRouter();
  const { loginAsync, isLoading, loginError } = useAuth();
  const { track } = useAnalytics();
  const [checking, setChecking] = useState(true);

  // On mount: if a valid access token exists → redirect immediately.
  // If access token is absent/expired but a refresh token exists → exchange it first.
  useEffect(() => {
    let cancelled = false;

    async function checkTokens() {
      const accessToken  = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');

      // 1. Try the access token first
      if (accessToken) {
        try {
          const { data: user } = await apiClient.get('/users/me/', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (!cancelled) router.replace(await getPostLoginPath(user));
          return;
        } catch {
          // access token invalid / expired – fall through to refresh
        }
      }

      // 2. Try the refresh token
      if (refreshToken) {
        try {
          const { data } = await axios.post(
            `${baseURL}/auth/refresh/`,
            { refresh_token: refreshToken },
            { params: { set_cookie: false } },
          );
          const { access, refresh } = data;
          localStorage.setItem('access_token', access);
          localStorage.setItem('refresh_token', refresh);
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${access}`;

          const { data: user } = await apiClient.get('/users/me/');
          if (!cancelled) router.replace(await getPostLoginPath(user));
          return;
        } catch {
          // refresh token invalid – clear storage and show login form
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
      }

      if (!cancelled) setChecking(false);
    }

    checkTokens();
    return () => { cancelled = true; };
  }, [router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const result = await loginAsync(data);
      if (result && 'requires_otp' in result) {
        const otpResult = result as OTPLoginResponse;
        router.push(`/otp-verify?temp_token=${otpResult.temp_token}`);
      } else {
        track('user_signed_in', { method: 'email' });
        try {
          const userRes = await apiClient.get('/users/me');
          router.push(await getPostLoginPath(userRes.data));
        } catch {
          router.push('/dashboard');
        }
      }
    } catch {
      // error shown via loginError
    }
  };

  const getErrorMessage = () => {
    if (!loginError) return null;
    const err = loginError as { response?: { data?: { detail?: string } } };
    return err?.response?.data?.detail || 'Invalid username or password. Please try again.';
  };

  // Show a spinner while we're verifying existing tokens
  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Sign in to your account to continue</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {loginError && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
              {getErrorMessage()}
            </div>
          )}
          <Input
            id="username"
            type="text"
            label="Username"
            placeholder="your_username"
            {...register('username')}
            error={errors.username?.message}
          />
          <Input
            id="password"
            type="password"
            label="Password"
            placeholder="••••••••"
            {...register('password')}
            error={errors.password?.message}
          />
          <div className="flex items-center justify-end">
            <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline">
              Forgot password?
            </Link>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" isLoading={isLoading}>
            Sign in
          </Button>

          <SocialAuthButtons action="user_signed_in" />

          <p className="text-sm text-center text-gray-600">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-blue-600 hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}


