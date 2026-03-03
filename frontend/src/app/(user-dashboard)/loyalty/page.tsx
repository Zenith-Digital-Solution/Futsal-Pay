'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Award, TrendingUp, TrendingDown, Info } from 'lucide-react';

// ── Types matching actual backend schema ──────────────────────────────────────

interface LoyaltyAccount {
  points_balance: number;
  total_earned: number;
  total_redeemed: number;
}

interface LoyaltyTransaction {
  id: number;
  points: number;
  transaction_type: 'earned' | 'redeemed' | 'expired' | 'bonus' | 'refunded';
  description: string;
  created_at: string;
  booking_id?: number;
}

// ── Tier logic (client-side) ──────────────────────────────────────────────────

type Tier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

const TIERS: { name: Tier; label: string; min: number; max: number; color: string; bg: string }[] = [
  { name: 'BRONZE',   label: 'Bronze',   min: 0,    max: 500,  color: 'text-amber-700',  bg: 'bg-amber-100'  },
  { name: 'SILVER',   label: 'Silver',   min: 500,  max: 1500, color: 'text-slate-600',  bg: 'bg-slate-100'  },
  { name: 'GOLD',     label: 'Gold',     min: 1500, max: 3000, color: 'text-yellow-600', bg: 'bg-yellow-100' },
  { name: 'PLATINUM', label: 'Platinum', min: 3000, max: 3000, color: 'text-purple-700', bg: 'bg-purple-100' },
];

function getTier(points: number) {
  const tier = [...TIERS].reverse().find((t) => points >= t.min) ?? TIERS[0];
  const next = TIERS[TIERS.indexOf(tier) + 1];
  const progress = next ? Math.min(100, ((points - tier.min) / (next.min - tier.min)) * 100) : 100;
  const pointsToNext = next ? next.min - points : 0;
  return { tier, next, progress, pointsToNext };
}

const TYPE_COLORS: Record<string, string> = {
  earned:   'bg-green-50 text-green-700',
  bonus:    'bg-blue-50 text-blue-700',
  refunded: 'bg-blue-50 text-blue-700',
  redeemed: 'bg-orange-50 text-orange-700',
  expired:  'bg-gray-100 text-gray-500',
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LoyaltyPage() {
  const {
    data: account,
    isLoading: accountLoading,
    isError: accountError,
  } = useQuery<LoyaltyAccount>({
    queryKey: ['loyalty'],
    queryFn: async () => {
      const { data } = await apiClient.get<LoyaltyAccount>('/futsal/loyalty');
      return data;
    },
  });

  const {
    data: history = [],
    isLoading: historyLoading,
    isError: historyError,
  } = useQuery<LoyaltyTransaction[]>({
    queryKey: ['loyalty-history'],
    queryFn: async () => {
      const { data } = await apiClient.get<LoyaltyTransaction[]>('/futsal/loyalty/history');
      return data;
    },
  });

  const points = account?.points_balance ?? 0;
  const { tier, next, progress, pointsToNext } = getTier(points);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Loyalty Rewards</h1>
        <p className="text-gray-500 text-sm">Earn points on every booking and unlock exclusive rewards</p>
      </div>

      {/* Balance card */}
      {accountLoading ? (
        <Card><CardContent className="p-8"><Skeleton className="h-32 w-full" /></CardContent></Card>
      ) : accountError ? (
        <Card><CardContent className="p-6 text-center text-red-500">Failed to load loyalty account.</CardContent></Card>
      ) : account && (
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-blue-200 text-sm font-medium">Total Points</p>
                <p className="text-5xl font-bold mt-1">{points.toLocaleString()}</p>
                <p className="text-blue-200 text-sm mt-1">points available</p>
              </div>
              <div className="flex items-center gap-2">
                <Award className="h-8 w-8 text-yellow-300" />
                <span className={`rounded-full px-3 py-1 text-sm font-semibold ${tier.bg} ${tier.color}`}>
                  {tier.label}
                </span>
              </div>
            </div>

            {next ? (
              <div className="mt-5">
                <div className="flex justify-between text-xs text-blue-200 mb-1.5">
                  <span>{tier.label}</span>
                  <span>{pointsToNext.toLocaleString()} pts to {next.label}</span>
                </div>
                <div className="h-2 rounded-full bg-blue-400/40">
                  <div className="h-2 rounded-full bg-white transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
              </div>
            ) : (
              <p className="mt-4 text-blue-200 text-sm">🏆 You&apos;ve reached the highest tier!</p>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 divide-x divide-gray-100 border-t">
            <div className="p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">Total Earned</p>
              <p className="text-lg font-bold text-gray-900">{(account.total_earned).toLocaleString()}</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">Total Redeemed</p>
              <p className="text-lg font-bold text-gray-900">{(account.total_redeemed).toLocaleString()}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Info box */}
      <div className="flex gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
        <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700">
          <p className="font-medium">How it works</p>
          <p className="mt-0.5">
            Earn <strong>10 points</strong> per confirmed booking.
            Redeem <strong>100 points = NPR 50 off</strong> your next booking at checkout.
          </p>
        </div>
      </div>

      {/* Transaction history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Point History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {historyLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : historyError ? (
            <p className="p-6 text-center text-red-500 text-sm">Failed to load history.</p>
          ) : history.length === 0 ? (
            <div className="p-12 text-center">
              <Award className="mx-auto h-10 w-10 text-gray-200 mb-3" />
              <p className="text-gray-400 text-sm">No transactions yet. Make a booking to earn points!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
                    <th className="px-5 py-3 text-left font-medium">Date</th>
                    <th className="px-5 py-3 text-left font-medium">Description</th>
                    <th className="px-5 py-3 text-left font-medium">Type</th>
                    <th className="px-5 py-3 text-right font-medium">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((tx) => {
                    const isPositive = tx.points > 0;
                    return (
                      <tr key={tx.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                          {new Date(tx.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3 text-gray-700">{tx.description}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[tx.transaction_type] ?? 'bg-gray-100 text-gray-500'}`}>
                            {tx.transaction_type}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-semibold whitespace-nowrap">
                          {isPositive ? (
                            <span className="flex items-center justify-end gap-0.5 text-green-600">
                              <TrendingUp className="h-3.5 w-3.5" />+{tx.points}
                            </span>
                          ) : (
                            <span className="flex items-center justify-end gap-0.5 text-red-500">
                              <TrendingDown className="h-3.5 w-3.5" />{tx.points}
                            </span>
                          )}
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

