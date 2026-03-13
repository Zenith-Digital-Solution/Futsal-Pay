'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useGrounds, useGroundBookings, type Booking } from '@/hooks/use-futsal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
  confirmed:  'bg-green-100 text-green-700 border-green-200',
  pending:    'bg-yellow-100 text-yellow-700 border-yellow-200',
  cancelled:  'bg-gray-100 text-gray-500 border-gray-200',
  completed:  'bg-blue-100 text-blue-700 border-blue-200',
  no_show:    'bg-red-100 text-red-500 border-red-200',
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getWeekDates(anchor: Date): Date[] {
  const start = new Date(anchor);
  start.setDate(anchor.getDate() - anchor.getDay()); // Sunday
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function toISO(d: Date) {
  return d.toISOString().split('T')[0];
}

function DayColumn({ groundId, date }: { groundId: string; date: Date }) {
  const dateStr = toISO(date);
  const { data: bookings = [], isLoading } = useGroundBookings(groundId, { booking_date: dateStr });

  const isToday = toISO(new Date()) === dateStr;

  return (
    <div className="flex flex-col min-w-0">
      {/* Day header */}
      <div
        className={`text-center py-2 px-1 rounded-t-lg mb-2 ${
          isToday ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'
        }`}
      >
        <p className="text-xs font-medium">{DAY_NAMES[date.getDay()]}</p>
        <p className="text-lg font-bold leading-tight">{date.getDate()}</p>
      </div>

      {/* Bookings */}
      <div className="space-y-1.5 flex-1">
        {isLoading ? (
          <>
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </>
        ) : bookings.length === 0 ? (
          <p className="text-xs text-gray-300 text-center py-3">—</p>
        ) : (
          bookings.map((b: Booking) => (
            <div
              key={b.id}
              className={`rounded-lg border p-2 text-xs ${STATUS_STYLES[b.status] ?? 'bg-gray-50 border-gray-200 text-gray-600'}`}
            >
              <p className="font-semibold truncate">{b.team_name || `Booking #${b.id}`}</p>
              <p className="opacity-80">{b.start_time} – {b.end_time}</p>
              <span className="inline-block mt-0.5 capitalize font-medium">{b.status}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function BookingsCalendarPage() {
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [selectedGroundId, setSelectedGroundId] = useState<string | null>(null);

  const { data: grounds = [], isLoading: groundsLoading } = useGrounds();
  const groundId = selectedGroundId ?? grounds[0]?.id ?? '';
  const weekDates = getWeekDates(anchorDate);

  function prevWeek() {
    setAnchorDate((d) => { const n = new Date(d); n.setDate(d.getDate() - 7); return n; });
  }

  function nextWeek() {
    setAnchorDate((d) => { const n = new Date(d); n.setDate(d.getDate() + 7); return n; });
  }

  function goToday() {
    setAnchorDate(new Date());
  }

  const weekLabel = `${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/owner/bookings" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Bookings Calendar</h1>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Ground selector */}
        {groundsLoading ? (
          <Skeleton className="h-9 w-44 rounded-md" />
        ) : (
          <select
            className="border rounded-lg px-3 py-2 text-sm bg-white"
            value={selectedGroundId ?? ''}
            onChange={(e) => setSelectedGroundId(e.target.value || null)}
          >
            {grounds.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        )}

        {/* Week navigation */}
        <div className="flex items-center gap-1 ml-auto">
          <Button variant="outline" size="sm" onClick={prevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday} className="text-xs px-3">
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={nextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <span className="text-sm text-gray-500 font-medium">{weekLabel}</span>
      </div>

      {/* Calendar grid */}
      <Card className="rounded-xl shadow">
        <CardContent className="p-4">
          {!groundId ? (
            <p className="text-gray-400 text-sm py-8 text-center">Select a ground to view bookings.</p>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {weekDates.map((date) => (
                <DayColumn key={toISO(date)} groundId={groundId} date={date} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries({
          confirmed: 'Confirmed',
          pending: 'Pending',
          completed: 'Completed',
          cancelled: 'Cancelled',
        }).map(([status, label]) => (
          <span
            key={status}
            className={`px-2 py-0.5 rounded-full border font-medium ${STATUS_STYLES[status]}`}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
