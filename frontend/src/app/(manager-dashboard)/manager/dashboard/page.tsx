'use client';

import { useAuthStore } from '@/store/auth-store';
import { Calendar, MapPin, Users, ClipboardList } from 'lucide-react';
import Link from 'next/link';

export default function ManagerDashboardPage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {user?.first_name || user?.username}
        </h1>
        <p className="text-gray-500 mt-1">Ground Manager Dashboard</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/manager/grounds"
          className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 hover:shadow-md transition-shadow"
        >
          <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <MapPin className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Grounds</p>
            <p className="font-semibold text-gray-900">View</p>
          </div>
        </Link>

        <Link
          href="/manager/bookings"
          className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 hover:shadow-md transition-shadow"
        >
          <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Bookings</p>
            <p className="font-semibold text-gray-900">Manage</p>
          </div>
        </Link>

        <Link
          href="/manager/staff"
          className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 hover:shadow-md transition-shadow"
        >
          <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <Users className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Staff</p>
            <p className="font-semibold text-gray-900">Manage</p>
          </div>
        </Link>

        <Link
          href="/manager/reports"
          className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 hover:shadow-md transition-shadow"
        >
          <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
            <ClipboardList className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Reports</p>
            <p className="font-semibold text-gray-900">View</p>
          </div>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/manager/bookings"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            View Today's Bookings
          </Link>
          <Link
            href="/manager/staff"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
          >
            Add Tenant
          </Link>
        </div>
      </div>
    </div>
  );
}
