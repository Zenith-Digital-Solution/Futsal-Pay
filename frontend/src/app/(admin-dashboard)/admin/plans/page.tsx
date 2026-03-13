'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { extractErrorMsg } from '@/lib/error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus, Edit2, Trash2, CheckCircle, XCircle, Package,
  Users, MapPin, Clock, ChevronDown, ChevronUp,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

interface Plan {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price_monthly: number;
  price_quarterly: number | null;
  price_yearly: number | null;
  max_grounds: number;
  max_staff: number;
  trial_days: number;
  features: string | null;
  is_active: boolean;
  is_public: boolean;
}

const EMPTY_FORM = {
  name: '',
  slug: '',
  description: '',
  price_monthly: '',
  price_quarterly: '',
  price_yearly: '',
  max_grounds: '1',
  max_staff: '2',
  trial_days: '14',
  features: '',
  is_public: true,
};

// ── Hooks ──────────────────────────────────────────────────────────────────

function useAllPlans() {
  return useQuery<Plan[]>({
    queryKey: ['admin', 'plans', 'all'],
    queryFn: async () => {
      // Admin can see all plans including inactive
      const { data } = await apiClient.get('/subscriptions/plans/all');
      return data;
    },
  });
}

// ── Toast ──────────────────────────────────────────────────────────────────

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg text-sm font-medium ${
      type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
    }`}>
      {type === 'success' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
      {message}
      <button onClick={onClose} className="ml-2 text-white/80 hover:text-white">✕</button>
    </div>
  );
}

// ── Plan Form ──────────────────────────────────────────────────────────────

function PlanForm({
  initial,
  onSubmit,
  onCancel,
  isPending,
}: {
  initial: typeof EMPTY_FORM;
  onSubmit: (data: typeof EMPTY_FORM) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState(initial);
  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Plan Name *</label>
          <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Basic" required />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Slug *</label>
          <Input value={form.slug} onChange={e => set('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))} placeholder="e.g. basic" required />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label className="text-sm font-medium text-gray-700">Description</label>
          <textarea
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[60px]"
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Describe this plan..."
          />
        </div>
      </div>

      {/* Pricing */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3">Pricing (NPR)</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Monthly *</label>
            <Input type="number" min={0} value={form.price_monthly} onChange={e => set('price_monthly', e.target.value)} placeholder="e.g. 999" required />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Quarterly (3 months)</label>
            <Input type="number" min={0} value={form.price_quarterly} onChange={e => set('price_quarterly', e.target.value)} placeholder="e.g. 2499" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Yearly (12 months)</label>
            <Input type="number" min={0} value={form.price_yearly} onChange={e => set('price_yearly', e.target.value)} placeholder="e.g. 8999" />
          </div>
        </div>
      </div>

      {/* Limits */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Max Grounds</label>
          <Input type="number" min={1} value={form.max_grounds} onChange={e => set('max_grounds', e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Max Staff</label>
          <Input type="number" min={0} value={form.max_staff} onChange={e => set('max_staff', e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Trial Days</label>
          <Input type="number" min={0} value={form.trial_days} onChange={e => set('trial_days', e.target.value)} />
        </div>
      </div>

      {/* Features */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Features (one per line)</label>
        <textarea
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[80px]"
          value={form.features}
          onChange={e => set('features', e.target.value)}
          placeholder={"Priority support\nCustom branding\nAdvanced analytics"}
        />
        <p className="text-xs text-gray-400">Stored as a newline-separated list</p>
      </div>

      {/* Visibility */}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.is_public} onChange={e => set('is_public', e.target.checked)} className="rounded" />
        <span className="text-gray-700">Visible to owners (public)</span>
      </label>

      <div className="flex gap-3 pt-1">
        <Button onClick={() => onSubmit(form)} disabled={isPending || !form.name || !form.slug || !form.price_monthly}>
          {isPending ? 'Saving…' : 'Save Plan'}
        </Button>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function AdminPlansPage() {
  const qc = useQueryClient();
  const { data: plans = [], isLoading } = useAllPlans();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'plans'] });

  const createMutation = useMutation({
    mutationFn: async (form: typeof EMPTY_FORM) => {
      const { data } = await apiClient.post('/subscriptions/plans', {
        name: form.name,
        slug: form.slug,
        description: form.description || undefined,
        price_monthly: Number(form.price_monthly),
        price_quarterly: form.price_quarterly ? Number(form.price_quarterly) : undefined,
        price_yearly: form.price_yearly ? Number(form.price_yearly) : undefined,
        max_grounds: Number(form.max_grounds),
        max_staff: Number(form.max_staff),
        trial_days: Number(form.trial_days),
        features: form.features || undefined,
        is_public: form.is_public,
      });
      return data;
    },
    onSuccess: () => { invalidate(); setShowCreate(false); showToast('Plan created successfully.', 'success'); },
    onError: (e: unknown) => {
      showToast(extractErrorMsg(e, 'Failed to create plan.'), 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, form }: { id: number; form: typeof EMPTY_FORM }) => {
      const { data } = await apiClient.patch(`/subscriptions/plans/${id}`, {
        name: form.name,
        description: form.description || undefined,
        price_monthly: Number(form.price_monthly),
        price_quarterly: form.price_quarterly ? Number(form.price_quarterly) : null,
        price_yearly: form.price_yearly ? Number(form.price_yearly) : null,
        max_grounds: Number(form.max_grounds),
        max_staff: Number(form.max_staff),
        trial_days: Number(form.trial_days),
        features: form.features || undefined,
        is_public: form.is_public,
      });
      return data;
    },
    onSuccess: () => { invalidate(); setEditingId(null); showToast('Plan updated.', 'success'); },
    onError: (e: unknown) => {
      showToast(extractErrorMsg(e, 'Failed to update plan.'), 'error');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
      await apiClient.patch(`/subscriptions/plans/${id}`, { is_active });
    },
    onSuccess: () => { invalidate(); showToast('Plan status updated.', 'success'); },
    onError: () => showToast('Failed to update status.', 'error'),
  });

  const planToForm = (p: Plan): typeof EMPTY_FORM => ({
    name: p.name,
    slug: p.slug,
    description: p.description ?? '',
    price_monthly: String(p.price_monthly),
    price_quarterly: p.price_quarterly != null ? String(p.price_quarterly) : '',
    price_yearly: p.price_yearly != null ? String(p.price_yearly) : '',
    max_grounds: String(p.max_grounds),
    max_staff: String(p.max_staff),
    trial_days: String(p.trial_days),
    features: p.features ?? '',
    is_public: p.is_public,
  });

  const parseFeatures = (raw: string | null): string[] => {
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return raw.split('\n').filter(Boolean); }
  };

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscription Plans</h1>
          <p className="text-gray-500 mt-1">Create and manage plans available to owners</p>
        </div>
        {!showCreate && (
          <Button onClick={() => setShowCreate(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> New Plan
          </Button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">Create New Plan</h2>
          <PlanForm
            initial={EMPTY_FORM}
            onSubmit={(form) => createMutation.mutate(form)}
            onCancel={() => setShowCreate(false)}
            isPending={createMutation.isPending}
          />
        </div>
      )}

      {/* Plans list */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <Package className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-500">No plans yet. Create your first plan above.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map(plan => (
            <div key={plan.id} className={`rounded-xl border bg-white p-5 flex flex-col gap-4 ${plan.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
              {editingId === plan.id ? (
                <PlanForm
                  initial={planToForm(plan)}
                  onSubmit={(form) => updateMutation.mutate({ id: plan.id, form })}
                  onCancel={() => setEditingId(null)}
                  isPending={updateMutation.isPending}
                />
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                        <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${plan.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {plan.is_active ? 'Active' : 'Inactive'}
                        </span>
                        {!plan.is_public && (
                          <span className="text-xs rounded-full px-2 py-0.5 font-medium bg-yellow-100 text-yellow-700">Hidden</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{plan.slug}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setEditingId(plan.id)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => toggleMutation.mutate({ id: plan.id, is_active: !plan.is_active })}
                        className={`p-1.5 rounded-md hover:bg-gray-100 ${plan.is_active ? 'text-red-500' : 'text-green-600'}`}
                      >
                        {plan.is_active ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  {plan.description && <p className="text-sm text-gray-500">{plan.description}</p>}

                  {/* Pricing tiers */}
                  <div className="rounded-lg bg-gray-50 p-3 space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Monthly</span>
                      <span className="font-semibold text-gray-900">NPR {plan.price_monthly.toLocaleString()}</span>
                    </div>
                    {plan.price_quarterly != null && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Quarterly</span>
                        <span className="font-semibold text-gray-900">
                          NPR {plan.price_quarterly.toLocaleString()}
                          <span className="text-xs text-green-600 ml-1">
                            ({Math.round((1 - plan.price_quarterly / (plan.price_monthly * 3)) * 100)}% off)
                          </span>
                        </span>
                      </div>
                    )}
                    {plan.price_yearly != null && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Yearly</span>
                        <span className="font-semibold text-gray-900">
                          NPR {plan.price_yearly.toLocaleString()}
                          <span className="text-xs text-green-600 ml-1">
                            ({Math.round((1 - plan.price_yearly / (plan.price_monthly * 12)) * 100)}% off)
                          </span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Limits */}
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {plan.max_grounds} ground{plan.max_grounds !== 1 ? 's' : ''}</span>
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {plan.max_staff} staff</span>
                    {plan.trial_days > 0 && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {plan.trial_days}d trial</span>}
                  </div>

                  {/* Features */}
                  {plan.features && parseFeatures(plan.features).length > 0 && (
                    <ul className="text-xs text-gray-600 space-y-1">
                      {parseFeatures(plan.features).map((f, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />{f}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
