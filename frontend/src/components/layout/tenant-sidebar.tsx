'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MapPin,
  CalendarDays,
  BookOpen,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/tenant/dashboard', icon: LayoutDashboard },
  { name: 'Ground', href: '/tenant/ground', icon: MapPin },
  { name: 'Schedule', href: '/tenant/schedule', icon: CalendarDays },
  { name: 'Bookings', href: '/tenant/bookings', icon: BookOpen },
];

export function TenantSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-10 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-white/10">
      <div className="flex h-16 items-center justify-center border-b border-gray-200 dark:border-white/10">
        <Link href="/tenant/dashboard" className="text-xl font-bold text-emerald-600">
          ⚽ Futsal Tenant
        </Link>
      </div>
      <nav className="flex flex-col gap-1 p-4">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                  : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
