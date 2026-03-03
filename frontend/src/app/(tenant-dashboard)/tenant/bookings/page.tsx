'use client';

import { useState } from 'react';
import { useGrounds, useGroundBookings, type Booking } from '@/hooks/use-futsal';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { BookOpen, Clock, Calendar } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
  no_show:   'bg-gray-100 text-gray-500',
};

export default function TenantBookingsPage() {
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);

  const { data: groundsData = [] } = useGrounds();
  const grounds = Array.isArray(groundsData) ? groundsData : (groundsData as any)?.items ?? [];
  const ground = grounds[0];

  const { data: bookings = [], isLoading } = useGroundBookings(ground?.id ?? 0, {
    booking_date: selectedDate,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-sm text-gray-500">{ground?.name ?? 'Ground'} bookings</p>
        </div>
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-44"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-5 w-5" />
            {new Date(selectedDate).toLocaleDateString('en-US', {
              weekday: 'long', month: 'long', day: 'numeric',
            })}
            <span className="ml-auto text-sm text-gray-400 font-normal">{bookings.length} booking{bookings.length !== 1 ? 's' : ''}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-gray-100 rounded animate-pulse" />)}
            </div>
          ) : bookings.length === 0 ? (
            <div className="py-10 text-center text-gray-400">
              <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No bookings for this date</p>
            </div>
          ) : (
            <div className="divide-y">
              {bookings.map((b: Booking) => (
                <div key={b.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {b.team_name || `Booking #${b.id}`}
                      </p>
                      <p className="text-xs text-gray-500">{b.start_time} – {b.end_time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold text-gray-900">
                      NPR {b.total_amount.toLocaleString()}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[b.status] ?? 'bg-gray-100'}`}>
                      {b.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
