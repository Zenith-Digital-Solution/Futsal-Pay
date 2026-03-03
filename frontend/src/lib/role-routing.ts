import type { User } from '@/types';
import { apiClient } from '@/lib/api-client';

/**
 * Returns the appropriate dashboard path for a user based on their role hierarchy.
 * Priority: superuser > owner > manager > tenant > user (default dashboard)
 */
export function getDashboardPath(user: User): string {
  if (user.is_superuser) return '/admin/dashboard';
  if (user.roles?.includes('owner')) return '/owner/dashboard';
  if (user.roles?.includes('manager')) return '/manager/dashboard';
  if (user.roles?.includes('tenant')) return '/tenant/dashboard';
  return '/dashboard';
}

/**
 * Returns the post-login redirect path, checking subscription status for owners.
 * Owners without an active subscription are sent to /owner/subscription.
 */
export async function getPostLoginPath(user: User): Promise<string> {
  if (user.is_superuser) return '/admin/dashboard';

  if (user.roles?.includes('owner')) {
    try {
      const { data } = await apiClient.get('/subscriptions/me');
      if (!data.is_active) return '/owner/subscription';
    } catch {
      // If the call fails (no subscription yet), send them to subscription page
      return '/owner/subscription';
    }
    return '/owner/dashboard';
  }

  if (user.roles?.includes('manager')) return '/manager/dashboard';
  if (user.roles?.includes('tenant')) return '/tenant/dashboard';
  return '/dashboard';
}
