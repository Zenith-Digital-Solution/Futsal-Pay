'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useGround, useUpdateGround } from '@/hooks/use-futsal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, CalendarX } from 'lucide-react';

export default function EditGroundPage() {
  const { id } = useParams<{ id: string }>();
  const groundId = Number(id);
  const router = useRouter();
  const { data: ground, isLoading } = useGround(groundId);
  const updateGround = useUpdateGround(groundId);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [form, setForm] = useState({
    name: '',
    location: '',
    description: '',
    ground_type: 'outdoor' as 'outdoor' | 'indoor' | 'hybrid',
    price_per_hour: '',
    weekend_price_per_hour: '',
    open_time: '',
    close_time: '',
    slot_duration_minutes: '60',
    peak_hours_start: '',
    peak_hours_end: '',
    peak_price_multiplier: '1.0',
    latitude: '',
    longitude: '',
  });

  useEffect(() => {
    if (ground) {
      setForm({
        name: ground.name,
        location: ground.location,
        description: ground.description ?? '',
        ground_type: ground.ground_type,
        price_per_hour: String(ground.price_per_hour),
        weekend_price_per_hour: ground.weekend_price_per_hour ? String(ground.weekend_price_per_hour) : '',
        open_time: ground.open_time,
        close_time: ground.close_time,
        slot_duration_minutes: String(ground.slot_duration_minutes),
        peak_hours_start: ground.peak_hours_start ?? '',
        peak_hours_end: ground.peak_hours_end ?? '',
        peak_price_multiplier: String(ground.peak_price_multiplier),
        latitude: ground.latitude ? String(ground.latitude) : '',
        longitude: ground.longitude ? String(ground.longitude) : '',
      });
    }
  }, [ground]);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await updateGround.mutateAsync({
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
      showToast('success', 'Saved successfully');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save';
      showToast('error', msg);
    }
  }

  async function handleToggleActive() {
    if (!ground) return;
    try {
      await updateGround.mutateAsync({ is_active: !ground.is_active });
      showToast('success', ground.is_active ? 'Ground deactivated' : 'Ground activated');
    } catch {
      showToast('error', 'Failed to update status');
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!ground) {
    return <p className="text-gray-500">Ground not found.</p>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/owner/grounds" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit Ground</h1>
        <span className="ml-auto">
          <Link href={`/owner/grounds/${id}/closures`}>
            <Button variant="outline" className="flex items-center gap-2 text-sm">
              <CalendarX className="h-4 w-4" />
              Manage Closures
            </Button>
          </Link>
        </span>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            toast.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Form */}
      <Card className="rounded-xl shadow">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Name *</label>
                <Input required value={form.name} onChange={(e) => set('name', e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Location *</label>
                <Input required value={form.location} onChange={(e) => set('location', e.target.value)} />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Description</label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[80px]"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Ground Type</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={form.ground_type}
                onChange={(e) => set('ground_type', e.target.value)}
              >
                <option value="outdoor">Outdoor</option>
                <option value="indoor">Indoor</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Price per Hour (NPR) *</label>
                <Input
                  required
                  type="number"
                  min={0}
                  value={form.price_per_hour}
                  onChange={(e) => set('price_per_hour', e.target.value)}
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Open Time *</label>
                <Input required type="time" value={form.open_time} onChange={(e) => set('open_time', e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Close Time *</label>
                <Input required type="time" value={form.close_time} onChange={(e) => set('close_time', e.target.value)} />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Slot Duration</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={form.slot_duration_minutes}
                onChange={(e) => set('slot_duration_minutes', e.target.value)}
              >
                <option value="30">30 minutes</option>
                <option value="60">60 minutes</option>
                <option value="90">90 minutes</option>
                <option value="120">120 minutes</option>
              </select>
            </div>

            <div className="rounded-lg bg-gray-50 p-4 space-y-4">
              <p className="text-sm font-medium text-gray-700">Peak Hours (optional)</p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Start</label>
                  <Input type="time" value={form.peak_hours_start} onChange={(e) => set('peak_hours_start', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">End</label>
                  <Input type="time" value={form.peak_hours_end} onChange={(e) => set('peak_hours_end', e.target.value)} />
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Latitude</label>
                <Input type="number" step="any" value={form.latitude} onChange={(e) => set('latitude', e.target.value)} placeholder="Optional" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Longitude</label>
                <Input type="number" step="any" value={form.longitude} onChange={(e) => set('longitude', e.target.value)} placeholder="Optional" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Link href="/owner/grounds">
                <Button type="button" variant="outline">Back to Grounds</Button>
              </Link>
              <Button
                type="submit"
                className="bg-green-600 hover:bg-green-700"
                disabled={updateGround.isPending}
              >
                {updateGround.isPending ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="rounded-xl shadow border-red-100">
        <CardContent className="p-6">
          <h2 className="text-base font-semibold text-red-600 mb-1">Danger Zone</h2>
          <p className="text-sm text-gray-500 mb-4">
            This ground is currently{' '}
            <span className={`font-medium ${ground.is_active ? 'text-green-600' : 'text-gray-500'}`}>
              {ground.is_active ? 'active' : 'inactive'}
            </span>
            . Inactive grounds are hidden from players.
          </p>
          <Button
            variant="outline"
            className={`border ${ground.is_active ? 'border-red-300 text-red-600 hover:bg-red-50' : 'border-green-300 text-green-600 hover:bg-green-50'}`}
            onClick={handleToggleActive}
            disabled={updateGround.isPending}
          >
            {ground.is_active ? 'Deactivate Ground' : 'Activate Ground'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
