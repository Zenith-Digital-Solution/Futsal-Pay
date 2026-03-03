'use client';

import { useAuthStore } from '@/store/auth-store';
import { CalendarDays, MapPin, BookOpen } from 'lucide-react';
import Link from 'next/link';

export default function TenantDashboardPage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {user?.first_name || user?.username}
        </h1>
        <p className="text-gray-500 mt-1">Tenant Dashboard</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/tenant/ground"
          className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 hover:shadow-md transition-shadow"
        >
          <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
            <MapPin className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Ground</p>
            <p className="font-semibold text-gray-900">View Details</p>
          </div>
        </Link>

        <Link
          href="/tenant/schedule"
          className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 hover:shadow-md transition-shadow"
        >
          <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <CalendarDays className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Schedule</p>
            <p className="font-semibold text-gray-900">View Today</p>
          </div>
        </Link>

        <Link
          href="/tenant/bookings"
          className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 hover:shadow-md transition-shadow"
        >
          <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Bookings</p>
            <p className="font-semibold text-gray-900">Manage</p>
          </div>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Today's Schedule</h2>
        <Link
          href="/tenant/schedule"
          className="inline-block px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700"
        >
          View Full Schedule
        </Link>
      </div>
    </div>
  );
}
