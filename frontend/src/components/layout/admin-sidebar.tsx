'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Shield,
  Settings,
  Activity,
  MapPin,
  Wallet,
  BadgeCheck,
  Package,
} from 'lucide-react';
import { OrgSwitcher } from './org-switcher';

const adminNavigation = [
  { name: 'Admin Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Manage Users', href: '/admin/users', icon: Users },
  { name: 'Roles & Permissions', href: '/admin/rbac', icon: Shield },
  { name: 'Active Sessions', href: '/admin/sessions', icon: Activity },
  { name: 'Grounds', href: '/admin/grounds', icon: MapPin },
  { name: 'Payouts', href: '/admin/payouts', icon: Wallet },
  { name: 'Subscriptions', href: '/admin/subscriptions', icon: BadgeCheck },
  { name: 'Plans', href: '/admin/plans', icon: Package },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-10 w-64 bg-white border-r border-gray-200">
      <div className="flex h-16 items-center justify-center border-b border-gray-200">
        <Link href="/admin/dashboard" className="text-xl font-bold text-blue-600">
          ⚽ Admin Panel
        </Link>
      </div>
      <OrgSwitcher />
      <nav className="flex flex-col gap-1 p-4 pt-0 overflow-y-auto">
        <div className="mb-2 px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Administration
        </div>
        {adminNavigation.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
