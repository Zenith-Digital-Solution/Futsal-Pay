'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Star, Search, Heart, SlidersHorizontal, Clock, CheckCircle, LogIn, Map, List, Navigation, Loader2 } from 'lucide-react';
import type { FutsalGround } from '@/hooks/use-futsal';
import GroundsMap from '@/components/map/grounds-map';

const LIMIT = 9;

const GROUND_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'indoor', label: 'Indoor' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'hybrid', label: 'Hybrid' },
];

const TYPE_STYLES: Record<string, { badge: string; gradient: string }> = {
  indoor:  { badge: 'bg-blue-100 text-blue-700',    gradient: 'from-blue-50 to-blue-100'     },
  outdoor: { badge: 'bg-green-100 text-green-700',   gradient: 'from-green-50 to-emerald-100' },
  hybrid:  { badge: 'bg-purple-100 text-purple-700', gradient: 'from-purple-50 to-violet-100' },
};

// ── Skeleton ───────────────────────────────────────────────────────────────────

function GroundCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="h-48 bg-gray-100 animate-pulse" />
      <CardContent className="p-4 space-y-3">
        <div className="h-5 bg-gray-100 rounded animate-pulse w-3/4" />
        <div className="h-4 bg-gray-100 rounded animate-pulse w-1/2" />
        <div className="h-4 bg-gray-100 rounded animate-pulse w-1/3" />
        <div className="flex justify-between pt-1">
          <div className="h-5 bg-gray-100 rounded animate-pulse w-20" />
          <div className="h-7 bg-gray-100 rounded-lg animate-pulse w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Star Rating ────────────────────────────────────────────────────────────────

function StarRating({ rating, count }: { rating: number; count?: number }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star key={s} className={`h-3.5 w-3.5 ${s <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
        ))}
      </div>
      <span className="text-xs font-medium text-gray-700">{rating.toFixed(1)}</span>
      {count !== undefined && <span className="text-xs text-gray-400">({count})</span>}
    </div>
  );
}

// ── Ground Card ────────────────────────────────────────────────────────────────

function GroundCard({ ground, isFav, onToggleFav, isAuthenticated }: {
  ground: FutsalGround;
  isFav: boolean;
  onToggleFav: () => void;
  isAuthenticated: boolean;
}) {
  const styles = TYPE_STYLES[ground.ground_type] ?? { badge: 'bg-gray-100 text-gray-600', gradient: 'from-gray-50 to-gray-100' };

  return (
    <Card className="overflow-hidden hover:shadow-xl transition-all duration-200 group flex flex-col h-full border-gray-100 dark:border-white/10">
      {/* Image / gradient banner */}
      <div className={`relative h-48 bg-gradient-to-br ${styles.gradient} flex items-center justify-center overflow-hidden`}>
        {/* Decorative pitch lines */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-4 border-2 border-gray-500 rounded" />
          <div className="absolute top-1/2 left-4 right-4 border-t-2 border-gray-500 -translate-y-1/2" />
          <div className="absolute top-1/2 left-1/2 h-12 w-12 border-2 border-gray-500 rounded-full -translate-x-1/2 -translate-y-1/2" />
        </div>
        <span className="text-5xl select-none">⚽</span>

        {/* Type badge */}
        <span className={`absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full capitalize shadow-sm ${styles.badge}`}>
          {ground.ground_type}
        </span>

        {/* Verified badge */}
        {ground.is_verified && (
          <span className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-white/90 text-blue-600 shadow-sm">
            <CheckCircle className="h-3 w-3" /> Verified
          </span>
        )}

        {/* Favourite button — shown for logged-in users; prompts login for guests */}
        {isAuthenticated ? (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFav(); }}
            className="absolute top-3 right-3 p-2 rounded-full bg-white/90 hover:bg-white shadow-sm transition-all hover:scale-110"
            title={isFav ? 'Remove from favourites' : 'Add to favourites'}
          >
            <Heart className={`h-4 w-4 transition-colors ${isFav ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
          </button>
        ) : (
          <Link
            href="/login?redirect=/grounds"
            onClick={(e) => e.stopPropagation()}
            className="absolute top-3 right-3 p-2 rounded-full bg-white/90 hover:bg-white shadow-sm transition-all hover:scale-110"
            title="Sign in to save favourites"
          >
            <Heart className="h-4 w-4 text-gray-300" />
          </Link>
        )}

        {/* Price overlay */}
        <div className="absolute bottom-3 right-3 bg-white/95 rounded-lg px-2.5 py-1 shadow-sm">
          <p className="text-sm font-bold text-green-700">
            Rs. {ground.price_per_hour.toLocaleString()}
            <span className="text-xs text-gray-400 font-normal">/hr</span>
          </p>
        </div>
      </div>

      {/* Content */}
      <CardContent className="p-4 flex flex-col flex-1 gap-2">
        <div>
          <Link href={`/grounds/${ground.id}`}>
            <h3 className="font-bold text-gray-900 text-base leading-snug group-hover:text-blue-600 transition-colors line-clamp-1">
              {ground.name}
            </h3>
          </Link>
          <div className="flex items-center gap-1 text-gray-500 text-sm mt-0.5">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span className="truncate">{ground.location}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <StarRating rating={ground.average_rating || 0} count={ground.rating_count || 0} />
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="h-3.5 w-3.5" />
            {ground.open_time.slice(0, 5)} – {ground.close_time.slice(0, 5)}
          </div>
        </div>

        {/* Amenities */}
        {ground.amenities && (
          <div className="flex flex-wrap gap-1">
            {Object.entries(ground.amenities)
              .filter(([, v]) => v)
              .slice(0, 4)
              .map(([k]) => (
                <span key={k} className="text-xs bg-gray-50 border border-gray-100 text-gray-500 px-2 py-0.5 rounded-full capitalize">
                  {k.replace(/_/g, ' ')}
                </span>
              ))}
          </div>
        )}

        <div className="mt-auto pt-2">
          <Link href={`/grounds/${ground.id}`} className="block">
            <Button className="w-full h-9 bg-green-600 hover:bg-green-700 text-sm font-semibold">
              View & Book
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

type ViewMode = 'list' | 'map';
type LocState = 'idle' | 'loading' | 'granted' | 'denied';

export default function BrowseGroundsPage() {
  const qc = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  const [search, setSearch]       = useState('');
  const [groundType, setType]     = useState('');
  const [minPrice, setMin]        = useState('');
  const [maxPrice, setMax]        = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [skip, setSkip]           = useState(0);
  const [allGrounds, setAll]      = useState<FutsalGround[]>([]);
  const [hasMore, setHasMore]     = useState(true);
  const [filterKey, setFilterKey] = useState(0);

  // Map view state
  const [viewMode, setViewMode]       = useState<ViewMode>('list');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locState, setLocState]       = useState<LocState>('idle');

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocState('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocState('granted');
      },
      () => setLocState('denied'),
      { timeout: 10_000 },
    );
  }, []);

  // Auto-request location when user switches to map view
  const handleViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode === 'map' && locState === 'idle') requestLocation();
  };

  const queryParams = {
    ...(search     && { search }),
    ...(groundType && { ground_type: groundType }),
    ...(minPrice   && { min_price: Number(minPrice) }),
    ...(maxPrice   && { max_price: Number(maxPrice) }),
    skip,
    limit: LIMIT,
  };

  const { data, isLoading, isFetching } = useQuery<FutsalGround[]>({
    queryKey: ['grounds-browse', filterKey, skip],
    queryFn: async () => {
      const { data } = await apiClient.get<FutsalGround[]>('/futsal/grounds', { params: queryParams });
      return data;
    },
  });

  // Only fetch favourites when authenticated
  const { data: favData = [] } = useQuery<{ id: string; ground_id: string }[]>({
    queryKey: ['favourites'],
    queryFn: async () => {
      const { data } = await apiClient.get('/futsal/favourites');
      return data;
    },
    enabled: isAuthenticated,
  });
  const favouriteIds = new Set(favData.map((f) => f.ground_id));

  const toggleFav = useMutation({
    mutationFn: async ({ id, isFav }: { id: string; isFav: boolean }) => {
      if (isFav) await apiClient.delete(`/futsal/favourites/${id}`);
      else       await apiClient.post(`/futsal/favourites/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['favourites'] }),
  });

  useEffect(() => {
    if (!data) return;
    setAll(skip === 0 ? data : (prev) => [...prev, ...data]);
    setHasMore(data.length === LIMIT);
  }, [data, skip]);

  const handleSearch = () => {
    setSkip(0);
    setAll([]);
    setFilterKey((k) => k + 1);
  };

  const hasActiveFilters = groundType || minPrice || maxPrice;

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#0A0F1E]">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Browse Grounds</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {allGrounds.length > 0
                ? `${allGrounds.length} ground${allGrounds.length !== 1 ? 's' : ''} available`
                : 'Find and book the perfect futsal ground near you — no account required to browse.'}
            </p>
          </div>
          {!isAuthenticated && (
            <Link
              href="/login"
              className="shrink-0 flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              <LogIn className="h-4 w-4" /> Sign in to save favourites
            </Link>
          )}
        </div>

        {/* Search + filter bar */}
        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 p-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or location…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9 border-0 bg-gray-50 dark:bg-white/5 focus-visible:ring-1 focus-visible:ring-emerald-500 h-10"
              />
            </div>
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                showFilters || hasActiveFilters
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300'
                  : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-white/5'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <span className="h-5 w-5 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center">
                  {[groundType, minPrice, maxPrice].filter(Boolean).length}
                </span>
              )}
            </button>
            <Button onClick={handleSearch} className="h-10 px-5 bg-green-600 hover:bg-green-700 shrink-0">
              Search
            </Button>
          </div>

          {showFilters && (
            <div className="border-t border-gray-100 dark:border-white/5 px-3 pb-3 pt-3 flex flex-wrap gap-4 bg-gray-50/50 dark:bg-white/[0.02]">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Ground Type</label>
                <div className="flex gap-2 flex-wrap">
                  {GROUND_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setType(opt.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        groundType === opt.value
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-slate-300 hover:border-emerald-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Price Range (Rs/hr)</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => setMin(e.target.value)}
                    className="w-24 h-9 text-sm"
                  />
                  <span className="text-gray-400 text-sm">–</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => setMax(e.target.value)}
                    className="w-24 h-9 text-sm"
                  />
                </div>
              </div>

              {hasActiveFilters && (
                <div className="flex flex-col gap-1 justify-end">
                  <label className="text-xs opacity-0">clear</label>
                  <button
                    onClick={() => { setType(''); setMin(''); setMax(''); }}
                    className="px-3 py-1.5 rounded-lg text-sm text-red-500 border border-red-100 bg-white dark:bg-white/5 hover:bg-red-50 transition-colors"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* List / Map view toggle */}
        {allGrounds.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 shadow-sm">
              <button
                onClick={() => handleViewMode('list')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white dark:bg-white/5 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-white/10'
                }`}
              >
                <List className="h-4 w-4" /> List
              </button>
              <button
                onClick={() => handleViewMode('map')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-l border-gray-200 dark:border-white/10 ${
                  viewMode === 'map'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white dark:bg-white/5 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-white/10'
                }`}
              >
                <Map className="h-4 w-4" /> Map
              </button>
            </div>

            {/* Location button (shown in map view) */}
            {viewMode === 'map' && (
              <button
                onClick={requestLocation}
                disabled={locState === 'loading'}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-white/10 disabled:opacity-50 transition-colors"
              >
                {locState === 'loading' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Navigation className={`h-4 w-4 ${locState === 'granted' ? 'text-emerald-500' : ''}`} />
                )}
                {locState === 'granted' ? 'Location active' : locState === 'denied' ? 'Location denied' : 'My location'}
              </button>
            )}
          </div>
        )}

        {/* ── MAP VIEW ────────────────────────────────────────────────────── */}
        {viewMode === 'map' && !isLoading && (
          <div className="space-y-3">
            {locState === 'denied' && (
              <div className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-lg px-4 py-2.5">
                Location access was denied. The map will centre on available grounds instead.
              </div>
            )}
            {allGrounds.filter((g) => g.latitude != null && g.longitude != null).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-400 gap-2">
                <MapPin className="h-8 w-8 opacity-40" />
                <p className="text-sm">No grounds have location data yet.</p>
              </div>
            ) : (
              <GroundsMap grounds={allGrounds} userLocation={userLocation} />
            )}
          </div>
        )}

        {/* ── LIST VIEW ───────────────────────────────────────────────────── */}
        {viewMode === 'list' && (
          <>
            {isLoading && (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => <GroundCardSkeleton key={i} />)}
              </div>
            )}

            {!isLoading && allGrounds.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="h-20 w-20 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4">
                  <MapPin className="h-10 w-10 text-gray-300 dark:text-slate-600" />
                </div>
                <p className="text-lg font-semibold text-gray-700 dark:text-slate-300">No grounds found</p>
                <p className="text-sm text-gray-400 mt-1 mb-4">
                  {hasActiveFilters ? 'Try adjusting your search or clearing the filters.' : 'No grounds are currently listed.'}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={() => { setType(''); setMin(''); setMax(''); handleSearch(); }}
                    className="text-sm text-emerald-600 hover:underline"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            )}

            {!isLoading && allGrounds.length > 0 && (
              <>
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {allGrounds.map((g) => (
                    <GroundCard
                      key={g.id}
                      ground={g}
                      isAuthenticated={isAuthenticated}
                      isFav={favouriteIds.has(g.id)}
                      onToggleFav={() => toggleFav.mutate({ id: g.id, isFav: favouriteIds.has(g.id) })}
                    />
                  ))}
                </div>

                {hasMore && (
                  <div className="flex justify-center pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setSkip((p) => p + LIMIT)}
                      disabled={isFetching}
                      className="px-8 h-10"
                    >
                      {isFetching ? (
                        <span className="flex items-center gap-2">
                          <span className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin" />
                          Loading…
                        </span>
                      ) : 'Load More'}
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Guest booking CTA at the bottom */}
        {!isAuthenticated && allGrounds.length > 0 && (
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/40 px-6 py-5">
            <div>
              <p className="font-semibold text-emerald-800 dark:text-emerald-300">Ready to play?</p>
              <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-0.5">
                Create a free account to book slots, save favourites, and more.
              </p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Link
                href="/login"
                className="px-4 py-2 rounded-lg border border-emerald-300 dark:border-emerald-600 text-emerald-700 dark:text-emerald-300 text-sm font-medium hover:bg-emerald-100 dark:hover:bg-emerald-800/30 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition-colors shadow-sm"
              >
                Create Account
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
