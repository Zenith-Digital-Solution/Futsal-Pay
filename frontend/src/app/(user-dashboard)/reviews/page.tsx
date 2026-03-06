'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, MessageSquare, MapPin, Trash2, CheckCircle2, Clock, Calendar } from 'lucide-react';
import Link from 'next/link';
import type { Review } from '@/hooks/use-futsal';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PendingReview {
  booking_id: string;
  ground_id: string;
  ground_name: string;
  ground_location: string;
  booking_date: string;
  start_time: string;
  end_time: string;
}

interface ReviewWithExtra extends Review {
  ground_name?: string;
  created_at?: string;
}

type ActiveTab = 'pending' | 'submitted';

// ── Star picker ───────────────────────────────────────────────────────────────

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button key={s} type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          className="focus:outline-none"
        >
          <Star className={`h-6 w-6 transition-colors ${s <= (hover || value) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
        </button>
      ))}
    </div>
  );
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`h-4 w-4 ${s <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
      ))}
    </div>
  );
}

// ── Inline review form ────────────────────────────────────────────────────────

function PendingReviewCard({ item, onSubmitted }: { item: PendingReview; onSubmitted: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [rating, setRating]     = useState(0);
  const [comment, setComment]   = useState('');
  const qc = useQueryClient();

  const submit = useMutation({
    mutationFn: async () => {
      await apiClient.post('/futsal/reviews', {
        ground_id: item.ground_id,
        booking_id: item.booking_id,
        rating,
        comment: comment.trim() || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pending-reviews'] });
      qc.invalidateQueries({ queryKey: ['my-reviews'] });
      onSubmitted();
    },
  });

  return (
    <Card className="border-emerald-100 dark:border-emerald-900/30">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <Link href={`/grounds/${item.ground_id}`}
              className="font-semibold text-gray-900 dark:text-white hover:text-emerald-600 transition-colors block truncate"
            >
              {item.ground_name}
            </Link>
            <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
              <MapPin className="h-3 w-3" /> {item.ground_location}
            </div>
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{item.booking_date}</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{item.start_time.slice(0,5)} – {item.end_time.slice(0,5)}</span>
            </div>
          </div>

          {!expanded && (
            <Button size="sm" variant="outline"
              className="shrink-0 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              onClick={() => setExpanded(true)}
            >
              <Star className="h-3.5 w-3.5 mr-1" /> Rate Now
            </Button>
          )}
        </div>

        {expanded && (
          <div className="mt-4 space-y-3 border-t border-gray-100 dark:border-white/10 pt-4">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Your Rating</p>
              <StarPicker value={rating} onChange={setRating} />
            </div>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience (optional)"
              className="w-full border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white rounded-lg px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {submit.isError && (
              <p className="text-xs text-red-500">Failed to submit. Please try again.</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setExpanded(false)}>Cancel</Button>
              <Button size="sm"
                disabled={rating === 0 || submit.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => submit.mutate()}
              >
                {submit.isPending ? 'Submitting…' : 'Submit Review'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MyReviewsPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<ActiveTab>('pending');
  const [submittedFlash, setFlash] = useState(false);

  // Pending reviews (completed bookings without a review)
  const { data: pendingItems = [], isLoading: pendingLoading } = useQuery<PendingReview[]>({
    queryKey: ['pending-reviews'],
    queryFn: async () => {
      const { data } = await apiClient.get('/futsal/bookings/pending-reviews');
      return data;
    },
  });

  // Submitted reviews
  const { data: reviews = [], isLoading: reviewsLoading } = useQuery<ReviewWithExtra[]>({
    queryKey: ['my-reviews'],
    queryFn: async () => {
      const { data } = await apiClient.get('/futsal/reviews/my');
      return data;
    },
  });

  // Enrich reviews with ground names
  const { data: grounds = [] } = useQuery<{ id: string; name: string; slug: string }[]>({
    queryKey: ['grounds-minimal'],
    queryFn: async () => {
      const { data } = await apiClient.get('/futsal/grounds', { params: { limit: 200 } });
      return data;
    },
    enabled: reviews.length > 0,
  });
  const groundMap = Object.fromEntries(grounds.map((g) => [g.id, g]));
  const enriched = reviews.map((r) => ({ ...r, ground_name: groundMap[r.ground_id]?.name }));

  const deleteReview = useMutation({
    mutationFn: async (id: string) => { await apiClient.delete(`/futsal/reviews/${id}`); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-reviews'] }),
  });

  const handleSubmitted = () => {
    setFlash(true);
    setActiveTab('submitted');
    setTimeout(() => setFlash(false), 3000);
  };

  const tabs = [
    { key: 'pending' as ActiveTab, label: 'Pending Reviews', count: pendingItems.length },
    { key: 'submitted' as ActiveTab, label: 'My Reviews', count: reviews.length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reviews</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400">
          Rate grounds you've played at, and manage reviews you've submitted.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-white/10">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-slate-300'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                activeTab === tab.key
                  ? tab.key === 'pending' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-600'
                  : 'bg-gray-100 text-gray-500'
              }`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Success flash */}
      {submittedFlash && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/40 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> Review submitted — thank you!
        </div>
      )}

      {/* ── PENDING TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'pending' && (
        pendingLoading ? (
          <div className="space-y-4">{[1,2,3].map((i) => <Card key={i}><CardContent className="p-5"><Skeleton className="h-20 w-full" /></CardContent></Card>)}</div>
        ) : pendingItems.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-300 mb-4" />
              <p className="text-gray-600 dark:text-slate-300 font-medium">All caught up!</p>
              <p className="text-sm text-gray-400 mt-1">
                No pending reviews. Play more games to review grounds.
              </p>
              <Link href="/grounds" className="mt-4 inline-block">
                <Button variant="outline" size="sm">Browse Grounds</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {pendingItems.length} ground{pendingItems.length !== 1 ? 's' : ''} waiting for your review
            </p>
            {pendingItems.map((item) => (
              <PendingReviewCard key={item.booking_id} item={item} onSubmitted={handleSubmitted} />
            ))}
          </div>
        )
      )}

      {/* ── SUBMITTED TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'submitted' && (
        reviewsLoading ? (
          <div className="space-y-4">{[1,2,3].map((i) => <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>)}</div>
        ) : enriched.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p className="text-gray-500 font-medium">No reviews yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Complete a booking and rate the ground from the Pending tab.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {enriched.length} review{enriched.length !== 1 ? 's' : ''} submitted
            </p>
            {enriched.map((review) => (
              <Card key={review.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 text-sm font-semibold text-gray-900 dark:text-white mb-1">
                        <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        {review.ground_name
                          ? <Link href={`/grounds/${review.ground_id}`} className="hover:text-emerald-600 transition-colors">{review.ground_name}</Link>
                          : `Ground #${review.ground_id}`}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <StarDisplay rating={review.rating} />
                        {review.created_at && (
                          <span className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString()}</span>
                        )}
                      </div>
                      {review.comment && <p className="text-sm text-gray-700 dark:text-slate-300">{review.comment}</p>}
                      {review.owner_reply && (
                        <div className="mt-3 pl-3 border-l-2 border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 rounded p-2">
                          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-0.5">Owner reply</p>
                          <p className="text-sm text-gray-600 dark:text-slate-300">{review.owner_reply}</p>
                        </div>
                      )}
                    </div>
                    <button onClick={() => deleteReview.mutate(review.id)}
                      disabled={deleteReview.isPending && deleteReview.variables === review.id}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0 disabled:opacity-50"
                      title="Delete review"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
}
