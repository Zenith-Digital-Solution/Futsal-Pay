'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Calendar,
  MapPin,
  Heart,
  Gift,
  Bell,
  Settings,
  User,
  CreditCard,
  Key,
  Star,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'My Bookings', href: '/my-bookings', icon: Calendar },
  { name: 'Browse Grounds', href: '/browse', icon: MapPin },
  { name: 'Favourites', href: '/favourites', icon: Heart },
  { name: 'My Reviews', href: '/reviews', icon: Star },
  { name: 'Loyalty Points', href: '/loyalty', icon: Gift },
  { name: 'Notifications', href: '/notifications', icon: Bell },
  { name: 'Payments', href: '/finances', icon: CreditCard },
  { name: 'Profile', href: '/profile', icon: User },
  { name: 'Active Sessions', href: '/tokens', icon: Key },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-10 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-white/10">
      <div className="flex h-16 items-center justify-center border-b border-gray-200 dark:border-white/10">
        <Link href="/dashboard" className="text-xl font-bold text-blue-600">
          ⚽ Futsal Pay
        </Link>
      </div>
      <nav className="flex flex-col gap-1 p-4 overflow-y-auto">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/5'
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
