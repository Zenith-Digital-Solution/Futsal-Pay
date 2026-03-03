import type { User } from '@/types';

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
