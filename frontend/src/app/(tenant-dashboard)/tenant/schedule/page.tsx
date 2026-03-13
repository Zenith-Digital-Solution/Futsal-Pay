'use client';

import { useState } from 'react';
import { useGrounds, useGroundSlots, type Slot } from '@/hooks/use-futsal';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CalendarDays, Clock } from 'lucide-react';

function SlotChip({ slot }: { slot: Slot }) {
  const colors = !slot.is_available
    ? 'bg-red-100 text-red-700 border-red-200'
    : 'bg-green-100 text-green-700 border-green-200';
  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm ${colors}`}>
      <span className="flex items-center gap-1.5 font-medium">
        <Clock className="h-3.5 w-3.5" />
        {slot.start_time} – {slot.end_time}
      </span>
      <span className="text-xs">{slot.is_available ? 'Available' : 'Booked'}</span>
    </div>
  );
}

export default function TenantSchedulePage() {
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);

  const { data: groundsData = [] } = useGrounds();
  const grounds = Array.isArray(groundsData) ? groundsData : (groundsData as any)?.items ?? [];
  const ground = grounds[0];

  const { data: slots = [], isLoading } = useGroundSlots(ground?.id ?? 0, selectedDate);

  const available = slots.filter((s) => s.is_available).length;
  const booked = slots.filter((s) => !s.is_available).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
          <p className="text-sm text-gray-500">{ground?.name ?? 'Ground'} slot availability</p>
        </div>
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-44"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Available Slots</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{available}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Booked Slots</p>
            <p className="text-3xl font-bold text-red-500 mt-1">{booked}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-5 w-5" />
            {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-2 gap-2">
              {[...Array(8)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}
            </div>
          ) : slots.length === 0 ? (
            <div className="py-10 text-center text-gray-400">
              <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No slots configured for this date</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {slots.map((slot, i) => <SlotChip key={i} slot={slot} />)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
