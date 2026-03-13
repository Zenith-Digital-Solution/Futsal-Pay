'use client';

import { useAuthStore } from '@/store/auth-store';
import { useListUsers } from '@/hooks/use-users';
import { useTokens } from '@/hooks/use-tokens';
import { useRoles } from '@/hooks/use-rbac';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Users, Key, Shield, Activity, UserCheck, UserX, MapPin, Wallet, BadgeCheck } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const { user } = useAuthStore();
  const { data: usersData } = useListUsers({ limit: 1 });
  const { data: tokenData } = useTokens({ limit: 1 });
  const { data: rolesData } = useRoles();

  const totalUsers = usersData?.total ?? 0;
  const activeSessions = tokenData?.total ?? 0;
  const totalRoles = rolesData?.items?.length ?? rolesData?.total ?? 0;

  const stats = [
    {
      name: 'Total Users',
      value: String(totalUsers),
      icon: Users,
      href: '/admin/users',
      color: 'text-blue-600 bg-blue-50',
    },
    {
      name: 'Active Sessions',
      value: String(activeSessions),
      href: '/admin/sessions',
      icon: Key,
      color: 'text-purple-600 bg-purple-50',
    },
    {
      name: 'Roles',
      value: String(totalRoles),
      href: '/admin/rbac',
      icon: Shield,
      color: 'text-emerald-600 bg-emerald-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Welcome back{user?.first_name ? `, ${user.first_name}` : ''}! Platform overview &amp; management.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Link key={stat.name} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`rounded-full p-3 ${stat.color}`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{stat.name}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Activity className="h-5 w-5 text-blue-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { href: '/admin/users',        icon: Users,      label: 'Manage Users',        desc: 'View, edit, delete users',    color: 'text-blue-600' },
                { href: '/admin/rbac',          icon: Shield,     label: 'Roles & Permissions', desc: 'Manage access control',       color: 'text-emerald-600' },
                { href: '/admin/sessions',      icon: Key,        label: 'Active Sessions',     desc: 'Monitor & revoke tokens',     color: 'text-purple-600' },
                { href: '/admin/grounds',       icon: MapPin,     label: 'All Grounds',         desc: 'Browse platform grounds',     color: 'text-orange-600' },
                { href: '/admin/subscriptions', icon: BadgeCheck, label: 'Subscriptions',       desc: 'Manage owner subscriptions',  color: 'text-teal-600' },
                { href: '/admin/payouts',       icon: Wallet,     label: 'Payouts',             desc: 'Review pending payouts',      color: 'text-amber-600' },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col gap-2 p-4 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Users className="h-5 w-5 text-blue-600" />
              User Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/admin/users"
              className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <UserCheck className="h-5 w-5 text-green-600" />
                <span className="text-sm text-gray-800">View All Users</span>
              </div>
              <span className="text-xs text-gray-400">{totalUsers} total</span>
            </Link>
            <Link
              href="/admin/users"
              className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <UserX className="h-5 w-5 text-red-500" />
                <span className="text-sm text-gray-800">Manage Superusers</span>
              </div>
              <span className="text-xs text-gray-400">Edit roles</span>
            </Link>
            <Link
              href="/admin/rbac"
              className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-emerald-600" />
                <span className="text-sm text-gray-800">Roles &amp; Permissions</span>
              </div>
              <span className="text-xs text-gray-400">{totalRoles} roles</span>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
