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
    <aside className="fixed inset-y-0 left-0 z-10 w-64 bg-white border-r border-gray-200">
      <div className="flex h-16 items-center justify-center border-b border-gray-200">
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
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
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
