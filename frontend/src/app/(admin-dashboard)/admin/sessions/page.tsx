'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, Search, ShieldOff, RefreshCw } from 'lucide-react';

interface TokenRecord {
  id: string;
  user_id: number;
  token_type: string;
  ip_address: string;
  user_agent: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
  revoked_at?: string;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

export default function AdminSessionsPage() {
  const qc = useQueryClient();
  const [userIdFilter, setUserIdFilter] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [page, setPage] = useState(0);
  const limit = 50;

  const userId = userIdFilter.trim() ? Number(userIdFilter.trim()) : undefined;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-sessions', userId, activeOnly, page],
    queryFn: async () => {
      const params: Record<string, unknown> = { skip: page * limit, limit };
      if (userId) params.user_id = userId;
      if (activeOnly) params.active_only = true;
      const { data } = await apiClient.get<PaginatedResponse<TokenRecord>>(
        '/tokens/admin/all',
        { params },
      );
      return data;
    },
  });

  const revoke = useMutation({
    mutationFn: async (tokenId: string) => {
      await apiClient.post(`/tokens/admin/revoke/${tokenId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-sessions'] }),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Sessions</h1>
        <p className="text-gray-500 mt-1">View and revoke active login sessions across all users.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="rounded-full p-3 bg-blue-50 text-blue-600">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="rounded-full p-3 bg-green-50 text-green-600">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active</p>
              <p className="text-2xl font-bold text-gray-900">
                {items.filter((t) => t.is_active).length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="rounded-full p-3 bg-red-50 text-red-500">
              <ShieldOff className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Revoked</p>
              <p className="text-2xl font-bold text-gray-900">
                {items.filter((t) => !t.is_active).length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="number"
            placeholder="Filter by User ID…"
            value={userIdFilter}
            onChange={(e) => { setUserIdFilter(e.target.value); setPage(0); }}
            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm bg-white w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => { setActiveOnly(e.target.checked); setPage(0); }}
            className="rounded border-gray-300 text-blue-600"
          />
          Active only
        </label>
        <button
          onClick={() => qc.invalidateQueries({ queryKey: ['admin-sessions'] })}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-gray-900">
            Sessions
            <span className="ml-2 text-sm font-normal text-gray-400">({total})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : isError ? (
            <p className="p-6 text-center text-red-500 text-sm">Failed to load sessions.</p>
          ) : items.length === 0 ? (
            <p className="p-8 text-center text-gray-400 text-sm">No sessions found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left font-medium">User ID</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-left font-medium">IP Address</th>
                  <th className="px-4 py-3 text-left font-medium">Device</th>
                  <th className="px-4 py-3 text-left font-medium">Expires</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((token) => (
                  <tr key={token.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-gray-600">#{token.user_id}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        token.token_type === 'access'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {token.token_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-600">{token.ip_address ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate" title={token.user_agent}>
                      {token.user_agent ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(token.expires_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        token.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {token.is_active ? 'Active' : 'Revoked'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {token.is_active && (
                        <button
                          onClick={() => revoke.mutate(token.id)}
                          disabled={revoke.isPending}
                          className="text-sm text-red-600 hover:underline disabled:opacity-50"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Page {page + 1} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
