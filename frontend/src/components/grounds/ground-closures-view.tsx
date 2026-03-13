'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  useGround,
  useGroundClosures,
  useClosurePreview,
  useAddClosure,
  useRemoveClosure,
  type ClosurePreview,
} from '@/hooks/use-futsal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft, Trash2, CalendarOff, AlertTriangle, CheckCircle,
  XCircle, ChevronRight, RefreshCcw, Bell,
} from 'lucide-react';
import { extractErrorMsg } from '@/lib/error';

// ── Types ──────────────────────────────────────────────────────────────────

type Step = 'form' | 'preview';

interface FormState {
  start_date: string;
  end_date: string;
  reason: string;
}

// ── Confirmation Dialog ────────────────────────────────────────────────────

function ConfirmDialog({
  preview,
  form,
  onConfirm,
  onBack,
  loading,
}: {
  preview: ClosurePreview;
  form: FormState;
  onConfirm: () => void;
  onBack: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start gap-3 p-6 border-b dark:border-gray-700">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Confirm Ground Closure</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {form.start_date} → {form.end_date}
              {form.reason && <span className="ml-1 italic">"{form.reason}"</span>}
            </p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Impact summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 p-4 text-center">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{preview.affected_count}</p>
              <p className="text-xs text-red-500 dark:text-red-400 mt-1">Bookings to cancel</p>
            </div>
            <div className="rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 p-4 text-center">
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                NPR {preview.total_refund_amount.toLocaleString()}
              </p>
              <p className="text-xs text-orange-500 dark:text-orange-400 mt-1">Total refund due</p>
            </div>
          </div>

          {/* Notification notice */}
          {preview.affected_count > 0 && (
            <div className="flex items-start gap-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4">
              <Bell className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700 dark:text-blue-300">
                All {preview.affected_count} affected customer{preview.affected_count !== 1 ? 's' : ''} will
                receive an in-app notification about the cancellation and refund.
              </p>
            </div>
          )}

          {/* Affected bookings list */}
          {preview.bookings.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Affected Bookings</p>
              <div className="rounded-xl border dark:border-gray-700 overflow-hidden divide-y dark:divide-gray-700 max-h-52 overflow-y-auto">
                {preview.bookings.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between px-4 py-2.5 text-sm bg-white dark:bg-gray-800"
                  >
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">{b.booking_date}</span>
                      <span className="text-gray-500 dark:text-gray-400 ml-2">
                        {b.start_time.slice(0, 5)} – {b.end_time.slice(0, 5)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {b.paid_amount > 0 && (
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          NPR {b.paid_amount.toLocaleString()}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 capitalize">
                        {b.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {preview.affected_count === 0 && (
            <div className="flex items-center gap-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 p-4">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              <p className="text-sm text-green-700 dark:text-green-300">
                No existing bookings in this date range. Safe to close.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-6 pb-6">
          <Button variant="outline" onClick={onBack} disabled={loading}>
            Back
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <RefreshCcw className="h-4 w-4 animate-spin" /> Closing…
              </span>
            ) : (
              'Confirm & Close Ground'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Shared Component ──────────────────────────────────────────────────

interface GroundClosuresViewProps {
  groundId: string;
  /** Back-link destination, e.g. "/owner/grounds/5" or "/manager/grounds" */
  backHref: string;
}

export function GroundClosuresView({ groundId, backHref }: GroundClosuresViewProps) {
  const { data: ground, isLoading: groundLoading } = useGround(groundId);
  const { data: closures = [], isLoading: closuresLoading } = useGroundClosures(groundId);
  const previewMutation = useClosurePreview(groundId);
  const addClosure = useAddClosure(groundId);
  const removeClosure = useRemoveClosure(groundId);

  const [form, setForm] = useState<FormState>({ start_date: '', end_date: '', reason: '' });
  const [step, setStep] = useState<Step>('form');
  const [preview, setPreview] = useState<ClosurePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function handlePreview(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const result = await previewMutation.mutateAsync({
        start_date: form.start_date,
        end_date: form.end_date,
      });
      setPreview(result);
      setStep('preview');
    } catch (err) {
      setError(extractErrorMsg(err, 'Failed to load preview'));
    }
  }

  async function handleConfirm() {
    setError(null);
    try {
      const result = await addClosure.mutateAsync({
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason || undefined,
      });
      setStep('form');
      setPreview(null);
      setForm({ start_date: '', end_date: '', reason: '' });
      const cancelled = result.cancelled_bookings ?? 0;
      setSuccessMsg(
        cancelled > 0
          ? `Closure added. ${cancelled} booking${cancelled !== 1 ? 's' : ''} cancelled & customers notified.`
          : 'Closure added successfully.'
      );
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      setError(extractErrorMsg(err, 'Failed to add closure'));
      setStep('form');
      setPreview(null);
    }
  }

  async function handleDelete(closureId: string) {
    try {
      await removeClosure.mutateAsync(closureId);
      setConfirmDelete(null);
    } catch (err) {
      setError(extractErrorMsg(err, 'Failed to remove closure'));
    }
  }

  return (
    <div className="space-y-6">
      {/* Confirmation dialog overlay */}
      {step === 'preview' && preview && (
        <ConfirmDialog
          preview={preview}
          form={form}
          onConfirm={handleConfirm}
          onBack={() => { setStep('form'); setPreview(null); }}
          loading={addClosure.isPending}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={backHref}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {groundLoading ? (
              <Skeleton className="h-7 w-64 inline-block" />
            ) : (
              <>Ground Closures — {ground?.name}</>
            )}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Schedule closure periods. All bookings in the range will be automatically cancelled and customers notified.
          </p>
        </div>
      </div>

      {/* Toast messages */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          <XCircle className="h-4 w-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-300">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Add Closure Form */}
      <Card className="rounded-2xl shadow-sm border dark:border-gray-700 dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 dark:text-white">
            <CalendarOff className="h-4 w-4 text-red-500" />
            Schedule a Closure
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePreview} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Start Date *</label>
                <Input
                  required
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={form.start_date}
                  onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">End Date *</label>
                <Input
                  required
                  type="date"
                  min={form.start_date || new Date().toISOString().split('T')[0]}
                  value={form.end_date}
                  onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Reason</label>
                <Input
                  value={form.reason}
                  onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                  placeholder="e.g. Maintenance, Tournament…"
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                You&apos;ll see a preview of affected bookings before confirming.
              </p>
              <Button
                type="submit"
                className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
                disabled={previewMutation.isPending || !form.start_date || !form.end_date}
              >
                {previewMutation.isPending ? (
                  <><RefreshCcw className="h-4 w-4 animate-spin" /> Checking…</>
                ) : (
                  <>Preview Impact <ChevronRight className="h-4 w-4" /></>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Closures List */}
      <Card className="rounded-2xl shadow-sm border dark:border-gray-700 dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="text-base dark:text-white">Scheduled Closures</CardTitle>
        </CardHeader>
        <CardContent>
          {closuresLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
            </div>
          ) : closures.length === 0 ? (
            <div className="py-12 text-center">
              <CalendarOff className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">No closures scheduled.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-gray-700 text-left text-gray-500 dark:text-gray-400">
                    <th className="pb-3 font-medium">Start Date</th>
                    <th className="pb-3 font-medium">End Date</th>
                    <th className="pb-3 font-medium">Reason</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {closures.map((c) => {
                    const now = new Date().toISOString().split('T')[0];
                    const isActive = c.start_date <= now && c.end_date >= now;
                    const isPast = c.end_date < now;
                    return (
                      <tr key={c.id} className="group">
                        <td className="py-3 text-gray-900 dark:text-white font-medium">{c.start_date}</td>
                        <td className="py-3 text-gray-900 dark:text-white">{c.end_date}</td>
                        <td className="py-3 text-gray-500 dark:text-gray-400">{c.reason || '—'}</td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isActive && (
                              <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-medium">
                                Active
                              </span>
                            )}
                            {isPast && (
                              <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                                Past
                              </span>
                            )}
                            {!isPast && !isActive && (
                              <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                Upcoming
                              </span>
                            )}
                            {confirmDelete === c.id ? (
                              <span className="inline-flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                                  onClick={() => handleDelete(c.id)}
                                  disabled={removeClosure.isPending}
                                >
                                  Confirm
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs dark:border-gray-600 dark:text-gray-300"
                                  onClick={() => setConfirmDelete(null)}
                                >
                                  Cancel
                                </Button>
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50 dark:border-gray-600 dark:hover:bg-red-900/20"
                                onClick={() => setConfirmDelete(c.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
