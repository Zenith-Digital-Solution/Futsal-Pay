'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSubscription } from '@/hooks/use-subscription';
import { useAuthStore } from '@/store/auth-store';

interface SubscriptionGateProps {
  children: React.ReactNode;
}

const SUBSCRIPTION_EXEMPT_PATHS = ['/owner/subscription'];

export function SubscriptionGate({ children }: SubscriptionGateProps) {
  const { user } = useAuthStore();
  const { data: subscription, isLoading } = useSubscription();
  const pathname = usePathname();
  const router = useRouter();

  const isExempt =
    user?.is_superuser ||
    SUBSCRIPTION_EXEMPT_PATHS.some((p) => pathname?.startsWith(p));

  const isActive = subscription?.is_active ?? false;

  useEffect(() => {
    if (!isExempt && !isLoading && !isActive) {
      router.replace('/owner/subscription');
    }
  }, [isExempt, isLoading, isActive, router]);

  if (isExempt) return <>{children}</>;

  if (isLoading || !isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return <>{children}</>;
}
