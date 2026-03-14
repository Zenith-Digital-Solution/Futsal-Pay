'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  MapPin,
  Users,
  ClipboardList,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/manager/dashboard', icon: LayoutDashboard },
  { name: 'Grounds', href: '/manager/grounds', icon: MapPin },
  { name: 'Bookings', href: '/manager/bookings', icon: Calendar },
  { name: 'Staff', href: '/manager/staff', icon: Users },
  { name: 'Reports', href: '/manager/reports', icon: ClipboardList },
];

export function ManagerSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-10 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-white/10">
      <div className="flex h-16 items-center justify-center border-b border-gray-200 dark:border-white/10">
        <Link href="/manager/dashboard" className="text-xl font-bold text-blue-600">
          ⚽ Futsal Manager
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
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
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
