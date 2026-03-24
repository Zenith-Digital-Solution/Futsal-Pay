'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface OwnerOption {
  id: string;
  username: string;
  email: string;
}

export default function AdminCreateGroundPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    owner_id: '',
    location: '',
    ground_type: 'outdoor',
    price_per_hour: '1200',
    open_time: '06:00:00',
    close_time: '22:00:00',
    slot_duration_minutes: '60',
  });

  const { data: owners = [], isLoading } = useQuery({
    queryKey: ['admin-ground-owners'],
    queryFn: async () => {
      const { data } = await apiClient.get('/users', { params: { limit: 100 } });
      const items = data?.items ?? [];
      return items.map((u: any) => ({ id: u.id, username: u.username, email: u.email })) as OwnerOption[];
    },
  });

  const ownerOptions = useMemo(() => owners, [owners]);

  const createGround = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        owner_id: form.owner_id,
        location: form.location,
        ground_type: form.ground_type,
        price_per_hour: Number(form.price_per_hour),
        open_time: form.open_time,
        close_time: form.close_time,
        slot_duration_minutes: Number(form.slot_duration_minutes),
      };
      const { data } = await apiClient.post('/futsal/grounds/admin/create', payload);
      return data;
    },
    onSuccess: () => router.push('/admin/grounds'),
    onError: (e: any) => setError(e?.response?.data?.detail ?? 'Failed to create ground.'),
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Add New Ground</h1>
        <p className="text-sm text-gray-500">Create a new ground as an administrator.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ground Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</p>}

          <Input label="Ground Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Owner</label>
            <select
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={form.owner_id}
              onChange={(e) => setForm({ ...form, owner_id: e.target.value })}
              disabled={isLoading}
            >
              <option value="">Select owner</option>
              {ownerOptions.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.username} ({owner.email})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Price per hour" type="number" value={form.price_per_hour} onChange={(e) => setForm({ ...form, price_per_hour: e.target.value })} />
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Ground Type</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={form.ground_type}
                onChange={(e) => setForm({ ...form, ground_type: e.target.value })}
              >
                <option value="outdoor">Outdoor</option>
                <option value="indoor">Indoor</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Input label="Open time" value={form.open_time} onChange={(e) => setForm({ ...form, open_time: e.target.value })} />
            <Input label="Close time" value={form.close_time} onChange={(e) => setForm({ ...form, close_time: e.target.value })} />
            <Input label="Slot (minutes)" type="number" value={form.slot_duration_minutes} onChange={(e) => setForm({ ...form, slot_duration_minutes: e.target.value })} />
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => createGround.mutate()}
              isLoading={createGround.isPending}
              disabled={!form.name || !form.location || !form.owner_id}
            >
              Create Ground
            </Button>
            <Link href="/admin/grounds">
              <Button variant="outline">Cancel</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
