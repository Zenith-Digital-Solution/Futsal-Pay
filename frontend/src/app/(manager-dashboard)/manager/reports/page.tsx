'use client';

import { useGrounds, useGroundBookings } from '@/hooks/use-futsal';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart3, TrendingUp, Calendar, DollarSign } from 'lucide-react';

export default function ManagerReportsPage() {
  const { data: groundsData = [] } = useGrounds();
  const grounds = Array.isArray(groundsData) ? groundsData : (groundsData as any)?.items ?? [];
  const primaryGround = grounds[0];

  const today = new Date().toISOString().split('T')[0];
  const { data: todayBookings = [] } = useGroundBookings(primaryGround?.id ?? 0, { booking_date: today });

  const confirmed = todayBookings.filter((b) => ['confirmed', 'completed'].includes(b.status));
  const todayRevenue = confirmed.reduce((s, b) => s + b.total_amount, 0);

  const stats = [
    { label: "Today's Bookings", value: todayBookings.length, icon: Calendar, color: 'text-blue-600 bg-blue-50' },
    { label: "Today's Revenue", value: `NPR ${todayRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-green-600 bg-green-50' },
    { label: 'Confirmed', value: confirmed.length, icon: TrendingUp, color: 'text-purple-600 bg-purple-50' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500">
          {primaryGround ? `Summary for ${primaryGround.name}` : 'Ground performance summary'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Today's Bookings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayBookings.length === 0 ? (
            <div className="py-10 text-center text-gray-400">
              <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No booking data for today</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayBookings.map((b) => (
                <div key={b.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{b.team_name || `Booking #${b.id}`}</p>
                    <p className="text-xs text-gray-500">{b.start_time} – {b.end_time}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">NPR {b.total_amount.toLocaleString()}</p>
                    <span className="text-xs text-gray-400">{b.status}</span>
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
