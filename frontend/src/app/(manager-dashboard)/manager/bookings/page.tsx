'use client';

import { useState } from 'react';
import { useGrounds, useGroundBookings, type Booking } from '@/hooks/use-futsal';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Calendar, Clock, Search } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
  no_show:   'bg-gray-100 text-gray-500',
};

function BookingRow({ booking }: { booking: Booking }) {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
          <Clock className="h-4 w-4 text-blue-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">
            {booking.team_name || `Booking #${booking.id}`}
          </p>
          <p className="text-xs text-gray-500">
            {booking.start_time} – {booking.end_time}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <p className="text-sm font-semibold text-gray-900">
          NPR {booking.total_amount != null ? booking.total_amount.toLocaleString() : '—'}
        </p>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[booking.status] ?? 'bg-gray-100'}`}>
          {booking.status}
        </span>
      </div>
    </div>
  );
}

export default function ManagerBookingsPage() {
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedGroundId, setSelectedGroundId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const { data: groundsData = [] } = useGrounds();
  const grounds = Array.isArray(groundsData) ? groundsData : (groundsData as any)?.items ?? [];
  const groundId = selectedGroundId ?? grounds[0]?.id ?? '';
  const { data: bookings = [], isLoading } = useGroundBookings(groundId, { booking_date: selectedDate });

  const filtered = bookings.filter((b) =>
    !search || (b.team_name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <p className="text-sm text-gray-500">View and manage ground bookings</p>
      </div>

      <div className="flex flex-wrap gap-3">
        {grounds.length > 1 && (
          <select
            value={selectedGroundId ?? ''}
            onChange={(e) => setSelectedGroundId(e.target.value || null)}
            className="border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {grounds.map((g: any) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        )}
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-44"
        />
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by team name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-5 w-5" />
            {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-gray-100 rounded animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-gray-400">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No bookings for this date</p>
            </div>
          ) : (
            <div>
              {filtered.map((b) => <BookingRow key={b.id} booking={b} />)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
