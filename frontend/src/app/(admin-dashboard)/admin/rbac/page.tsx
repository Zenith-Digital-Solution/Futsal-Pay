'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useRoles, useCreateRole, useAssignRole } from '@/hooks/use-rbac';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GroundSearchSelect } from '@/components/ui/ground-search-select';
import { Shield, UserPlus, Key, Users, CheckCircle, XCircle } from 'lucide-react';

const RESOURCES = ['grounds', 'bookings', 'reviews', 'users', 'staff', 'payments', 'reports', 'settings', 'subscriptions', 'payouts'] as const;
const ACTIONS = ['read', 'write', 'update', 'delete', 'manage'] as const;
const ALL_ROLES = ['owner', 'manager', 'tenant', 'user'] as const;

type Resource = typeof RESOURCES[number];
type Action = typeof ACTIONS[number];

interface CreateUserWithRolePayload {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  role: string;
  ground_id?: number | null;
}

function useCreateUserWithRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateUserWithRolePayload) => {
      const res = await apiClient.post('/users/create-with-role', payload);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rbac'] }),
  });
}

function useCreatePermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { resource: Resource; action: Action; description?: string; ground_id?: number | null }) => {
      const res = await apiClient.post('/permissions', payload);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rbac', 'permissions'] }),
  });
}

export default function AdminRbacPage() {
  const queryClient = useQueryClient();
  const { data: rolesData } = useRoles();
  const roles = rolesData?.items ?? [];

  const createUserMutation = useCreateUserWithRole();
  const createPermMutation = useCreatePermission();

  const EMPTY_USER_FORM = {
    username: '', email: '', password: '',
    first_name: '', last_name: '',
    role: 'owner',
    ground_id: null as number | null,
  };

  const [userForm, setUserForm] = useState(EMPTY_USER_FORM);

  const [permForm, setPermForm] = useState({
    resource: RESOURCES[0] as Resource,
    action: ACTIONS[0] as Action,
    description: '',
    ground_id: null as number | null,
  });

  const [activeTab, setActiveTab] = useState<'users' | 'permissions'>('users');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

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
        <h1 className="text-2xl font-bold text-gray-900">RBAC Management</h1>
        <p className="text-gray-500 mt-1">Manage roles, permissions, and user access</p>
      </div>

      {/* Roles Overview */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Shield className="h-5 w-5 text-indigo-600" />
          System Roles
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {ALL_ROLES.map((role) => (
            <div key={role} className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="font-medium text-gray-900 capitalize">{role}</p>
              <p className="text-xs text-gray-500 mt-1">
                {role === 'owner' ? 'Global' :
                 role === 'user' ? 'Global' :
                 'Ground-scoped'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'users'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-2"><UserPlus className="h-4 w-4" /> Create User with Role</span>
        </button>
        <button
          onClick={() => setActiveTab('permissions')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'permissions'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-2"><Key className="h-4 w-4" /> Create Permission</span>
        </button>
      </div>

      {activeTab === 'users' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Create User with Role</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Username</label>
              <Input value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} placeholder="username" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <Input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} placeholder="user@example.com" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Password</label>
              <Input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} placeholder="••••••••" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">First Name</label>
              <Input value={userForm.first_name} onChange={(e) => setUserForm({ ...userForm, first_name: e.target.value })} placeholder="First name" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Last Name</label>
              <Input value={userForm.last_name} onChange={(e) => setUserForm({ ...userForm, last_name: e.target.value })} placeholder="Last name" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Role</label>
              <select
                value={userForm.role}
                onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </div>
            {(userForm.role === 'manager' || userForm.role === 'tenant') && (
              <div>
                <GroundSearchSelect
                  label="Ground (for manager/tenant)"
                  value={userForm.ground_id}
                  onChange={(id) => setUserForm({ ...userForm, ground_id: id })}
                  placeholder="Select a ground…"
                />
              </div>
            )}
          </div>
          <div className="mt-4">
            <Button
              onClick={() => createUserMutation.mutate(
                {
                  ...userForm,
                  ground_id: userForm.ground_id,
                },
                {
                  onSuccess: (data: unknown) => {
                    const d = data as { username?: string; role?: string };
                    showToast(
                      `User "${d?.username ?? userForm.username}" created with role "${d?.role ?? userForm.role}".`,
                      'success',
                    );
                    setUserForm(EMPTY_USER_FORM);
                  },
                  onError: () => showToast('Failed to create user. Please check the details.', 'error'),
                },
              )}
              disabled={createUserMutation.isPending || !userForm.username || !userForm.email || !userForm.password}
            >
              {createUserMutation.isPending ? 'Creating...' : 'Create User'}
            </Button>          </div>
        </div>
      )}

      {activeTab === 'permissions' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Permission</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Resource</label>
              <select
                value={permForm.resource}
                onChange={(e) => setPermForm({ ...permForm, resource: e.target.value as Resource })}
                className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {RESOURCES.map((r) => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Action</label>
              <select
                value={permForm.action}
                onChange={(e) => setPermForm({ ...permForm, action: e.target.value as Action })}
                className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {ACTIONS.map((a) => (
                  <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Description</label>
              <Input
                value={permForm.description}
                onChange={(e) => setPermForm({ ...permForm, description: e.target.value })}
                placeholder="Optional description"
                className="mt-1"
              />
            </div>
            <div>
                <GroundSearchSelect
                  label="Ground (optional, for scoped permissions)"
                  value={permForm.ground_id}
                  onChange={(id) => setPermForm({ ...permForm, ground_id: id })}
                  placeholder="Leave blank for global"
                  optional
                />
              </div>
          </div>
          <div className="mt-4">
            <Button
              onClick={() => createPermMutation.mutate({
                resource: permForm.resource,
                action: permForm.action,
                description: permForm.description,
                ground_id: permForm.ground_id,
              })}
              disabled={createPermMutation.isPending}
            >
              {createPermMutation.isPending ? 'Creating...' : 'Create Permission'}
            </Button>
          </div>
          {createPermMutation.isError && (
            <p className="mt-2 text-sm text-red-600">Failed to create permission.</p>
          )}
          {createPermMutation.isSuccess && (
            <p className="mt-2 text-sm text-green-600">Permission created successfully!</p>
          )}
        </div>
      )}
    </div>
  );
}
