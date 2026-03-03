'use client';

import { useGrounds, FutsalGround } from '@/hooks/use-futsal';
import { MapPin, Clock, DollarSign } from 'lucide-react';

export default function ManagerGroundsPage() {
  const { data = [], isLoading } = useGrounds();
  const grounds: FutsalGround[] = Array.isArray(data) ? data : (data as any)?.items ?? [];

  if (isLoading) {
    return <div className="animate-pulse space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Grounds</h1>
      {grounds.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No grounds assigned to you yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {grounds.map((ground) => (
            <div key={ground.id} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{ground.name}</h3>
                  <p className="text-sm text-gray-500">{ground.location}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {ground.open_time} – {ground.close_time}
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  ${ground.price_per_hour}/hr
                </span>
              </div>
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                ground.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {ground.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
