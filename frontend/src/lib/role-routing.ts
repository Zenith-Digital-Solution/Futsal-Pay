import type { User } from '@/types';
import { apiClient } from '@/lib/api-client';

function normalizeRoles(user: User): Set<string> {
  return new Set((user.roles ?? []).map((r) => String(r).trim().toLowerCase()));
}

export function userHasRole(user: User, role: string): boolean {
  return normalizeRoles(user).has(role.toLowerCase());
}

/**
 * Returns the appropriate dashboard path for a user based on their role hierarchy.
 * Priority: superuser > owner > manager > tenant > user (default dashboard)
 */
export function getDashboardPath(user: User): string {
  if (user.is_superuser) return '/admin/dashboard';
  if (userHasRole(user, 'owner')) return '/owner/dashboard';
  if (userHasRole(user, 'manager')) return '/manager/dashboard';
  if (userHasRole(user, 'tenant')) return '/tenant/dashboard';
  return '/dashboard';
}

/**
 * Returns the post-login redirect path, checking subscription status for owners.
 * Owners without an active subscription are sent to /owner/subscription.
 */
export async function getPostLoginPath(user: User): Promise<string> {
  if (user.is_superuser) return '/admin/dashboard';

  if (userHasRole(user, 'owner')) {
    try {
      const { data } = await apiClient.get('/subscriptions/me');
      if (!data.is_active) return '/owner/subscription';
    } catch {
      // If the call fails (no subscription yet), send them to subscription page
      return '/owner/subscription';
    }
    return '/owner/dashboard';
  }

  if (userHasRole(user, 'manager')) return '/manager/dashboard';
  if (userHasRole(user, 'tenant')) return '/tenant/dashboard';
  return '/dashboard';
}
