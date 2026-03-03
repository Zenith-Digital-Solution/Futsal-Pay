'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCreateGround } from '@/hooks/use-futsal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, AlertTriangle, CreditCard } from 'lucide-react';

export default function NewGroundPage() {
  const router = useRouter();
  const createGround = useCreateGround();
  const [error, setError] = useState<{ message: string; isSubscription?: boolean } | null>(null);

  const [form, setForm] = useState({
    name: '',
    location: '',
    description: '',
    ground_type: 'outdoor' as 'outdoor' | 'indoor' | 'hybrid',
    price_per_hour: '',
    weekend_price_per_hour: '',
    open_time: '06:00',
    close_time: '22:00',
    slot_duration_minutes: '60',
    peak_hours_start: '',
    peak_hours_end: '',
    peak_price_multiplier: '1.0',
    latitude: '',
    longitude: '',
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createGround.mutateAsync({
        name: form.name,
        location: form.location,
        description: form.description || undefined,
        ground_type: form.ground_type,
        price_per_hour: Number(form.price_per_hour),
        weekend_price_per_hour: form.weekend_price_per_hour ? Number(form.weekend_price_per_hour) : undefined,
        open_time: form.open_time,
        close_time: form.close_time,
        slot_duration_minutes: Number(form.slot_duration_minutes),
        peak_hours_start: form.peak_hours_start || undefined,
        peak_hours_end: form.peak_hours_end || undefined,
        peak_price_multiplier: Number(form.peak_price_multiplier),
        latitude: form.latitude ? Number(form.latitude) : undefined,
        longitude: form.longitude ? Number(form.longitude) : undefined,
      });
      router.push('/owner/grounds');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { detail?: string | { message?: string } } } };
      const status = axiosErr?.response?.status;
      if (status === 402) {
        const detail = axiosErr.response?.data?.detail;
        const msg = typeof detail === 'object' ? detail?.message : detail;
        setError({
          message: msg || 'An active subscription is required to create grounds.',
          isSubscription: true,
        });
      } else {
        const detail = axiosErr?.response?.data?.detail;
        const msg = typeof detail === 'string' ? detail : err instanceof Error ? err.message : 'Failed to create ground';
        setError({ message: msg });
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/owner/grounds" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Ground</h1>
          <p className="text-gray-500 text-sm mt-0.5">Fill in the details to list your futsal ground</p>
        </div>
      </div>

      {error && (
        error.isSubscription ? (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-5 py-4 flex items-start gap-3">
            <CreditCard className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Subscription Required</p>
              <p className="text-sm text-amber-700 mt-0.5">{error.message}</p>
              <Link href="/owner/subscription">
                <Button size="sm" className="mt-3 bg-amber-600 hover:bg-amber-700 text-white">
                  View Subscription Plans
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-center gap-2 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {error.message}
          </div>
        )
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Info */}
        <Card className="rounded-xl border border-gray-200">
          <CardContent className="p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Basic Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Name *</label>
                <Input
                  required
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="e.g. Green Park Futsal"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Location *</label>
                <Input
                  required
                  value={form.location}
                  onChange={(e) => set('location', e.target.value)}
                  placeholder="e.g. Kathmandu, Baneshwor"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-sm font-medium text-gray-700">Description</label>
                <textarea
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 min-h-[80px]"
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="Describe your ground..."
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Ground Type</label>
                <select
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                  value={form.ground_type}
                  onChange={(e) => set('ground_type', e.target.value)}
                >
                  <option value="outdoor">Outdoor</option>
                  <option value="indoor">Indoor</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Slot Duration</label>
                <select
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                  value={form.slot_duration_minutes}
                  onChange={(e) => set('slot_duration_minutes', e.target.value)}
                >
                  <option value="30">30 minutes</option>
                  <option value="60">60 minutes</option>
                  <option value="90">90 minutes</option>
                  <option value="120">120 minutes</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card className="rounded-xl border border-gray-200">
          <CardContent className="p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Pricing</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Price per Hour (NPR) *</label>
                <Input
                  required
                  type="number"
                  min={0}
                  value={form.price_per_hour}
                  onChange={(e) => set('price_per_hour', e.target.value)}
                  placeholder="1000"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Weekend Price per Hour (NPR)</label>
                <Input
                  type="number"
                  min={0}
                  value={form.weekend_price_per_hour}
                  onChange={(e) => set('weekend_price_per_hour', e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-gray-50 p-4 space-y-4">
              <p className="text-sm font-medium text-gray-700">Peak Hours Pricing (optional)</p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Peak Start</label>
                  <Input
                    type="time"
                    value={form.peak_hours_start}
                    onChange={(e) => set('peak_hours_start', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Peak End</label>
                  <Input
                    type="time"
                    value={form.peak_hours_end}
                    onChange={(e) => set('peak_hours_end', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Price Multiplier</label>
                  <Input
                    type="number"
                    step="0.1"
                    min={1}
                    value={form.peak_price_multiplier}
                    onChange={(e) => set('peak_price_multiplier', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hours & Location */}
        <Card className="rounded-xl border border-gray-200">
          <CardContent className="p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Operating Hours & Location</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Open Time *</label>
                <Input
                  required
                  type="time"
                  value={form.open_time}
                  onChange={(e) => set('open_time', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Close Time *</label>
                <Input
                  required
                  type="time"
                  value={form.close_time}
                  onChange={(e) => set('close_time', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Latitude</label>
                <Input
                  type="number"
                  step="any"
                  value={form.latitude}
                  onChange={(e) => set('latitude', e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Longitude</label>
                <Input
                  type="number"
                  step="any"
                  value={form.longitude}
                  onChange={(e) => set('longitude', e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/owner/grounds">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button
            type="submit"
            className="bg-green-600 hover:bg-green-700"
            disabled={createGround.isPending}
          >
            {createGround.isPending ? 'Creating…' : 'Create Ground'}
          </Button>
        </div>
      </form>
    </div>
  );
}
