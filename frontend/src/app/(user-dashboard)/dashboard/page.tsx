'use client';

import { useAuthStore } from '@/store/auth-store';
import { useMyBookings, useLoyalty } from '@/hooks/use-futsal';
import { useNotifications } from '@/hooks/use-notifications';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Calendar, MapPin, Heart, Gift, Bell, Star,
  Clock, CheckCircle, AlertTriangle, Shield,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: bookingsData, isLoading: loadingBookings } = useMyBookings({ status_filter: 'upcoming' });
  const { data: loyaltyData } = useLoyalty();
  const { data: notifData } = useNotifications({ limit: 5 });

  const upcomingBookings = bookingsData ?? [];
  const loyaltyPoints = loyaltyData?.points_balance ?? 0;
  const unreadCount = notifData?.unread_count ?? 0;
  const recentNotifs = notifData?.items ?? [];

  const stats = [
    {
      name: 'Upcoming Bookings',
      value: Array.isArray(upcomingBookings) ? String(upcomingBookings.length) : '—',
      icon: Calendar,
      href: '/my-bookings',
      color: 'text-blue-600 bg-blue-50',
    },
    {
      name: 'Loyalty Points',
      value: String(loyaltyPoints),
      icon: Gift,
      href: '/loyalty',
      color: 'text-amber-600 bg-amber-50',
    },
    {
      name: 'Notifications',
      value: String(unreadCount),
      icon: Bell,
      href: '/notifications',
      color: 'text-purple-600 bg-purple-50',
    },
    {
      name: '2FA Status',
      value: user?.otp_enabled ? 'Enabled' : 'Disabled',
      icon: Shield,
      href: '/profile',
      color: user?.otp_enabled ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.first_name || user?.username}!
        </h1>
        <p className="text-gray-500 mt-1">Here's your Futsal activity overview.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link key={stat.name} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{stat.name}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  </div>
                  <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${stat.color}`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Bookings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Bookings
            </CardTitle>
            <Link href="/my-bookings" className="text-sm text-blue-600 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {loadingBookings ? (
              <div className="space-y-3">
                {[1, 2].map((i) => <div key={i} className="h-14 bg-gray-100 rounded animate-pulse" />)}
              </div>
            ) : !Array.isArray(upcomingBookings) || upcomingBookings.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No upcoming bookings</p>
                <Link href="/grounds" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
                  Browse grounds →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingBookings.slice(0, 3).map((b) => (
                  <div key={b.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                    <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                      <MapPin className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">Ground #{b.ground_id}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {b.booking_date} · {b.start_time}–{b.end_time}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 shrink-0">
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { href: '/grounds', icon: MapPin, label: 'Book a Ground', desc: 'Find & book nearby fields', color: 'text-blue-600' },
                { href: '/my-bookings', icon: Calendar, label: 'My Bookings', desc: 'View upcoming & past', color: 'text-green-600' },
                { href: '/favourites', icon: Heart, label: 'Favourites', desc: 'Saved grounds', color: 'text-red-500' },
                { href: '/loyalty', icon: Gift, label: 'Loyalty Points', desc: `${loyaltyPoints} pts available`, color: 'text-amber-600' },
                { href: '/notifications', icon: Bell, label: 'Notifications', desc: `${unreadCount} unread`, color: 'text-purple-600' },
                { href: '/profile', icon: Shield, label: 'Security', desc: 'Manage 2FA & password', color: 'text-gray-600' },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col gap-2 p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors"
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
      </div>

      {/* Recent Notifications */}
      {recentNotifs.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Recent Notifications
            </CardTitle>
            <Link href="/notifications" className="text-sm text-blue-600 hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentNotifs.slice(0, 4).map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 p-3 rounded-lg ${n.is_read ? '' : 'bg-blue-50'}`}
                >
                  <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${n.is_read ? 'bg-gray-300' : 'bg-blue-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{n.title}</p>
                    <p className="text-xs text-gray-500 truncate">{n.body}</p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">
                    {new Date(n.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {!user?.is_confirmed && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Email not verified</p>
                <p className="text-xs text-yellow-700">Verify your email to unlock all features.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

