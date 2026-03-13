'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useListUsers,
  useUpdateUser,
  useDeleteUser,
} from '@/hooks/use-users';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui';
import { Pagination } from '@/components/ui/pagination';
import { SearchBar } from '@/components/ui/search-bar';
import { GroundSearchSelect } from '@/components/ui/ground-search-select';
import {
  Users, Pencil, Trash2, Check, X, Shield,
} from 'lucide-react';
import type { User } from '@/types';
import type { UserRolesResponse } from '@/types/rbac';

function UserRow({ user, onEdit, onDelete }: {
  user: User;
  onEdit: (user: User) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <tr className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {user.image_url ? (
            <img src={user.image_url} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 text-sm font-medium">
              {(user.first_name?.[0] ?? user.username[0]).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
              {user.first_name || user.last_name
                ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()
                : user.username}
            </p>
            <p className="text-xs text-gray-400 dark:text-slate-500">{user.username}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-300">{user.email}</td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
          user.is_active ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
        }`}>
          {user.is_active ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
          {user.is_active ? 'Active' : 'Inactive'}
        </span>
        {user.is_superuser && (
          <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 text-xs font-medium text-purple-700 dark:text-purple-400">
            <Shield className="h-3 w-3" /> Superuser
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-400">
        {user.is_confirmed ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <X className="h-4 w-4 text-red-400" />
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(user)}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 rounded hover:bg-gray-100 dark:hover:bg-white/10"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(user.id)}
            className="p-1.5 text-red-400 hover:text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

const GROUND_ROLES = ['manager', 'tenant'] as const;
const GLOBAL_ROLES = ['owner', 'user'] as const;
const ALL_ASSIGNABLE = [...GLOBAL_ROLES, ...GROUND_ROLES] as const;
type AssignableRole = typeof ALL_ASSIGNABLE[number];

function useUserRoles(userId: string) {
  return useQuery({
    queryKey: ['user-roles-admin', userId],
    queryFn: async () => {
      const { data } = await apiClient.get<UserRolesResponse>(`/users/${userId}/roles`);
      return data;
    },
    enabled: !!userId,
  });
}

function useAssignRoleAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { user_id: string; role_id: string; domain: string }) => {
      const { data } = await apiClient.post('/users/assign-role', payload);
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['user-roles-admin', vars.user_id] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

function useRolesList() {
  return useQuery({
    queryKey: ['roles-list-admin'],
    queryFn: async () => {
      const { data } = await apiClient.get('/roles', { params: { limit: 100 } });
      return (data?.items ?? data) as { id: string; name: string }[];
    },
    staleTime: 60_000,
  });
}

function EditUserModal({ user, onClose }: { user: User; onClose: () => void }) {
  const updateUser = useUpdateUser();
  const assignRole = useAssignRoleAdmin();
  const { data: rolesList = [] } = useRolesList();
  const { data: userRoles, isLoading: rolesLoading } = useUserRoles(user.id);

  const [firstName, setFirstName] = useState(user.first_name ?? '');
  const [lastName, setLastName] = useState(user.last_name ?? '');
  const [isActive, setIsActive] = useState(user.is_active);
  const [isSuperuser, setIsSuperuser] = useState(user.is_superuser);

  // Role assignment form
  const [assignRoleName, setAssignRoleName] = useState<AssignableRole>('manager');
  const [assignGroundId, setAssignGroundId] = useState<number | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [roleSuccess, setRoleSuccess] = useState<string | null>(null);

  const needsGround = GROUND_ROLES.includes(assignRoleName as any);

  const handleSave = () => {
    updateUser.mutate(
      { userId: user.id, data: { first_name: firstName, last_name: lastName, is_active: isActive, is_superuser: isSuperuser } },
      { onSuccess: onClose }
    );
  };

  const handleAssignRole = () => {
    setRoleError(null);
    setRoleSuccess(null);
    if (needsGround && !assignGroundId) {
      setRoleError('Please select a ground for this role.');
      return;
    }
    const roleEntry = rolesList.find((r) => r.name === assignRoleName);
    if (!roleEntry) { setRoleError(`Role "${assignRoleName}" not found.`); return; }
    const domain = needsGround ? `ground:${assignGroundId}` : 'global';
    assignRole.mutate(
      { user_id: user.id, role_id: roleEntry.id, domain },
      {
        onSuccess: () => {
          setRoleSuccess(`Role "${assignRoleName}" assigned successfully.`);
          setAssignGroundId(null);
          setTimeout(() => setRoleSuccess(null), 3000);
        },
        onError: () => setRoleError('Failed to assign role. It may already be assigned.'),
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border dark:border-white/10 shadow-xl overflow-y-auto max-h-[90vh]">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Edit User — {user.username}</h2>

          {/* Profile fields */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              <Input placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded border-gray-300" />
                <span className="text-sm text-gray-700 dark:text-slate-300">Active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isSuperuser} onChange={(e) => setIsSuperuser(e.target.checked)} className="rounded border-gray-300" />
                <span className="text-sm text-gray-700 dark:text-slate-300">Superuser</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={handleSave} isLoading={updateUser.isPending}>Save Profile</Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>

          {/* Divider */}
          <div className="my-5 border-t dark:border-white/10" />

          {/* Current roles */}
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Current Roles</p>
            {rolesLoading ? (
              <div className="h-6 w-40 bg-gray-100 dark:bg-white/10 rounded animate-pulse" />
            ) : (userRoles?.roles?.length ?? 0) === 0 ? (
              <p className="text-xs text-gray-400 dark:text-slate-500">No roles assigned yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {userRoles?.roles?.map((r, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                    {typeof r === 'string' ? r : r.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Assign role form */}
          <div className="rounded-xl bg-gray-50 dark:bg-white/5 border dark:border-white/10 p-4 space-y-3">
            <p className="text-sm font-medium text-gray-700 dark:text-slate-300">Assign Role</p>

            <div>
              <label className="text-xs text-gray-500 dark:text-slate-400 mb-1 block">Role</label>
              <select
                value={assignRoleName}
                onChange={(e) => { setAssignRoleName(e.target.value as AssignableRole); setAssignGroundId(null); setRoleError(null); }}
                className="w-full rounded-md border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {ALL_ASSIGNABLE.map((r) => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </div>

            {needsGround && (
              <GroundSearchSelect
                label="Ground"
                value={assignGroundId}
                onChange={setAssignGroundId}
                placeholder="Select a ground…"
              />
            )}

            {roleError && <p className="text-xs text-red-500">{roleError}</p>}
            {roleSuccess && <p className="text-xs text-green-600 dark:text-green-400">{roleSuccess}</p>}

            <Button
              onClick={handleAssignRole}
              isLoading={assignRole.isPending}
              className="w-full"
            >
              Assign Role
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const { data, isLoading } = useListUsers({ skip: page * limit, limit, search: search || undefined });
  const deleteUser = useDeleteUser();

  const users = data?.items ?? [];
  const total = data?.total ?? 0;

  const handleDelete = (id: string) => {
    if (confirm('Delete this user? This cannot be undone.')) {
      deleteUser.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Users</h1>
          <p className="text-gray-500 dark:text-slate-400">Manage all platform users</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
          <Users className="h-4 w-4" />
          {total} total
        </div>
      </div>

      <SearchBar
        value={search}
        onChange={(v) => { setSearch(v); setPage(0); }}
        placeholder="Search by username or email…"
        className="max-w-sm"
      />

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 text-left">
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">User</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Email</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Confirmed</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8">
                    <Skeleton className="h-8 w-full" />
                  </td>
                </tr>
              )}
              {!isLoading && users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                    No users found.
                  </td>
                </tr>
              )}
              {users.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  onEdit={setEditingUser}
                  onDelete={handleDelete}
                />
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Pagination
        page={page}
        total={total}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(l) => { setLimit(l); setPage(0); }}
      />

      {editingUser && (
        <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} />
      )}
    </div>
  );
}

