'use client';

import Link from 'next/link';
import { useGrounds, FutsalGround } from '@/hooks/use-futsal';
import { MapPin, Clock, DollarSign, CalendarOff } from 'lucide-react';

export default function ManagerGroundsPage() {
  const { data = [], isLoading } = useGrounds();
  const grounds: FutsalGround[] = Array.isArray(data) ? data : (data as any)?.items ?? [];

  if (isLoading) {
    return <div className="animate-pulse space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Grounds</h1>
      {grounds.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">No grounds assigned to you yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {grounds.map((ground) => (
            <div key={ground.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{ground.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{ground.location}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {ground.open_time} – {ground.close_time}
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  NPR {ground.price_per_hour}/hr
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                  ground.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {ground.is_active ? 'Active' : 'Inactive'}
                </span>
                <Link
                  href={`/manager/grounds/${ground.id}/closures`}
                  className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 hover:underline font-medium"
                >
                  <CalendarOff className="h-3.5 w-3.5" />
                  Manage Closures
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


