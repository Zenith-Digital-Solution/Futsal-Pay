'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { apiClient } from '@/lib/api-client';
import { useGrounds } from '@/hooks/use-futsal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, UserPlus, Shield, Trash2, CheckCircle, XCircle } from 'lucide-react';

// Resource and Action enums (mirror backend)
const RESOURCES = ['grounds', 'bookings', 'reviews', 'users', 'staff', 'payments', 'reports', 'settings', 'subscriptions', 'payouts'] as const;
const ACTIONS = ['read', 'write', 'update', 'delete', 'manage'] as const;
const ASSIGNABLE_ROLES = ['manager', 'tenant'] as const;

type AssignableRole = typeof ASSIGNABLE_ROLES[number];

interface GroundMember {
  user_id: number;
  username: string;
  email: string;
  role: string;
  assigned_at: string;
}

interface Ground {
  id: number;
  name: string;
}

function useGroundMembers(groundId: number | null) {
  return useQuery({
    queryKey: ['ground-members', groundId],
    queryFn: async () => {
      if (!groundId) return { members: [] };
      const res = await apiClient.get(`/roles/grounds/${groundId}/members`);
      return res.data as { ground_id: number; members: GroundMember[] };
    },
    enabled: !!groundId,
  });
}

export default function OwnerRbacPage() {
  const { user } = useAuthStore();
  const { data: groundsRaw } = useGrounds();
  const grounds: Ground[] = Array.isArray(groundsRaw)
    ? groundsRaw.map((g: any) => ({ id: g.id, name: g.name }))
    : ((groundsRaw as any)?.items ?? []).map((g: any) => ({ id: g.id, name: g.name }));
  const queryClient = useQueryClient();

  const [selectedGroundId, setSelectedGroundId] = useState<number | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const EMPTY_FORM = {
    username: '', email: '', password: '',
    first_name: '', last_name: '',
    role: 'manager' as AssignableRole,
  };

  // Create user with role form
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: membersData, isLoading: membersLoading } = useGroundMembers(selectedGroundId);
  const members = membersData?.members ?? [];

  const createUserMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/users/create-with-role', {
        ...form,
        ground_id: selectedGroundId,
      });
      return res.data;
    },
    onSuccess: (data: unknown) => {
      queryClient.invalidateQueries({ queryKey: ['ground-members', selectedGroundId] });
      const d = data as { username?: string; role?: string };
      showToast(
        `Member "${d?.username ?? form.username}" created with role "${d?.role ?? form.role}".`,
        'success',
      );
      setShowCreateUser(false);
      setForm(EMPTY_FORM);
    },
    onError: () => showToast('Failed to create member. Please check the details and try again.', 'error'),
  });

  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId, domain }: { userId: string; roleId: string; domain: string }) => {
      await apiClient.delete('/users/remove-role', {
        data: { user_id: userId, role_id: roleId, domain },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ground-members', selectedGroundId] });
    },
  });

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg text-sm font-medium ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success'
            ? <CheckCircle className="h-4 w-4 flex-shrink-0" />
            : <XCircle className="h-4 w-4 flex-shrink-0" />}
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-2 text-white/80 hover:text-white">✕</button>
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Access Management</h1>
        <p className="text-gray-500 mt-1">Manage managers and tenants for your grounds</p>
      </div>

      {/* Ground Selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          Select Ground
        </h2>
        <div className="flex flex-wrap gap-2">
          {grounds.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGroundId(g.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedGroundId === g.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {g.name}
            </button>
          ))}
          {grounds.length === 0 && (
            <p className="text-gray-500 text-sm">No grounds found. Create a ground first.</p>
          )}
        </div>
      </div>

      {selectedGroundId && (
        <>
          {/* Members List */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Ground Members
              </h2>
              <Button
                onClick={() => setShowCreateUser(!showCreateUser)}
                className="flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Add Member
              </Button>
            </div>

            {membersLoading ? (
              <div className="animate-pulse space-y-3">
                {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-200 rounded-lg" />)}
              </div>
            ) : members.length === 0 ? (
              <p className="text-gray-500 text-sm py-4 text-center">No members assigned to this ground yet.</p>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={`${member.user_id}-${member.role}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{member.username}</p>
                      <p className="text-sm text-gray-500">{member.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        member.role === 'manager'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {member.role}
                      </span>
                      <button
                        onClick={() => {
                          // TODO: pass correct encoded IDs
                          console.log('Remove member', member.user_id);
                        }}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Remove member"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Create User Form */}
          {showCreateUser && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Member</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Username</label>
                  <Input
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="username"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="user@example.com"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Password</label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">First Name</label>
                  <Input
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    placeholder="First name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Last Name</label>
                  <Input
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    placeholder="Last name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as AssignableRole })}
                    className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {ASSIGNABLE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-4">
                <Button
                  onClick={() => createUserMutation.mutate()}
                  disabled={createUserMutation.isPending || !form.username || !form.email || !form.password}
                >
                  {createUserMutation.isPending ? 'Creating...' : 'Create Member'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateUser(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Superuser: also show a permission management section hint */}
      {user?.is_superuser && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-800 font-medium">
            Superuser mode: You can assign any role in any ground domain via the admin panel.
          </p>
        </div>
      )}
    </div>
  );
}
