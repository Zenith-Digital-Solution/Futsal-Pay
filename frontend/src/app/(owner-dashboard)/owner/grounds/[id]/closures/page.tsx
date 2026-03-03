'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useGround, useGroundClosures, useAddClosure, useRemoveClosure } from '@/hooks/use-futsal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Trash2, CalendarOff } from 'lucide-react';

export default function GroundClosuresPage() {
  const { id } = useParams<{ id: string }>();
  const groundId = Number(id);

  const { data: ground, isLoading: groundLoading } = useGround(groundId);
  const { data: closures = [], isLoading: closuresLoading } = useGroundClosures(groundId);
  const addClosure = useAddClosure(groundId);
  const removeClosure = useRemoveClosure(groundId);

  const [form, setForm] = useState({ start_date: '', end_date: '', reason: '' });
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await addClosure.mutateAsync({
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason || undefined,
      });
      setForm({ start_date: '', end_date: '', reason: '' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add closure');
    }
  }

  async function handleDelete(closureId: number) {
    try {
      await removeClosure.mutateAsync(closureId);
      setConfirmDelete(null);
    } catch {
      setError('Failed to delete closure');
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/owner/grounds/${id}`} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {groundLoading ? (
            <Skeleton className="h-7 w-64 inline-block" />
          ) : (
            <>Closures — {ground?.name}</>
          )}
        </h1>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Add Closure Form */}
      <Card className="rounded-xl shadow">
        <CardHeader>
          <CardTitle className="text-base">Add Closure Period</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Start Date *</label>
                <Input
                  required
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">End Date *</label>
                <Input
                  required
                  type="date"
                  min={form.start_date}
                  value={form.end_date}
                  onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Reason</label>
                <Input
                  value={form.reason}
                  onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                  placeholder="e.g. Maintenance"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                className="bg-green-600 hover:bg-green-700"
                disabled={addClosure.isPending}
              >
                {addClosure.isPending ? 'Adding…' : 'Add Closure'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Closures List */}
      <Card className="rounded-xl shadow">
        <CardHeader>
          <CardTitle className="text-base">Scheduled Closures</CardTitle>
        </CardHeader>
        <CardContent>
          {closuresLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : closures.length === 0 ? (
            <div className="py-10 text-center">
              <CalendarOff className="mx-auto h-10 w-10 text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">No closures scheduled. Add one above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 font-medium">Start Date</th>
                    <th className="pb-2 font-medium">End Date</th>
                    <th className="pb-2 font-medium">Reason</th>
                    <th className="pb-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {closures.map((c) => (
                    <tr key={c.id}>
                      <td className="py-3">{c.start_date}</td>
                      <td className="py-3">{c.end_date}</td>
                      <td className="py-3 text-gray-500">{c.reason || '—'}</td>
                      <td className="py-3 text-right">
                        {confirmDelete === c.id ? (
                          <span className="inline-flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs border-red-300 text-red-600 hover:bg-red-50"
                              onClick={() => handleDelete(c.id)}
                              disabled={removeClosure.isPending}
                            >
                              Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              onClick={() => setConfirmDelete(null)}
                            >
                              Cancel
                            </Button>
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setConfirmDelete(c.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
