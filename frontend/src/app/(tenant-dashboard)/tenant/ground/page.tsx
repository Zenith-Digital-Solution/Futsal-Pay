'use client';

import { useGrounds, type FutsalGround } from '@/hooks/use-futsal';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Clock, Star } from 'lucide-react';

export default function TenantGroundPage() {
  const { data: groundsData = [], isLoading } = useGrounds();
  const grounds: FutsalGround[] = Array.isArray(groundsData) ? groundsData : (groundsData as any)?.items ?? [];
  const ground = grounds[0];

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="h-48 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (!ground) {
    return (
      <div className="text-center py-20 text-gray-400">
        <MapPin className="h-12 w-12 mx-auto mb-4 opacity-40" />
        <p className="text-lg font-medium">No ground assigned</p>
        <p className="text-sm mt-1">Contact your manager for ground access.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Ground</h1>
        <p className="text-sm text-gray-500">Your assigned futsal ground</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
              <MapPin className="h-8 w-8 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">{ground.name}</h2>
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {ground.location}
              </p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-gray-400" />
                  {ground.open_time} – {ground.close_time}
                </span>
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-400" />
                  { ground.average_rating != null ? ground.average_rating.toFixed(1) : '—' } rating
                </span>
                <span className="capitalize px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700 font-medium">
                  {ground.ground_type}
                </span>
              </div>
              {ground.description && (
                <p className="mt-3 text-sm text-gray-600">{ground.description}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {ground.amenities && Object.keys(ground.amenities).length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Amenities</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(ground.amenities).map(([key, val]) =>
                val ? (
                  <span key={key} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm capitalize">
                    {key.replace(/_/g, ' ')}
                  </span>
                ) : null
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
