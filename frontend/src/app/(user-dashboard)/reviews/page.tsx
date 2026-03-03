'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, MessageSquare, MapPin, Trash2 } from 'lucide-react';
import type { Review } from '@/hooks/use-futsal';

interface ReviewWithGround extends Review {
  ground_name?: string;
  ground_slug?: string;
  created_at?: string;
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-4 w-4 ${s <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`}
        />
      ))}
    </div>
  );
}

export default function MyReviewsPage() {
  const qc = useQueryClient();

  const { data: reviews = [], isLoading, isError } = useQuery<ReviewWithGround[]>({
    queryKey: ['my-reviews'],
    queryFn: async () => {
      const { data } = await apiClient.get('/futsal/reviews/my');
      return data;
    },
  });

  // Enrich with ground names
  const { data: grounds = [] } = useQuery<{ id: number; name: string; slug: string }[]>({
    queryKey: ['grounds-minimal'],
    queryFn: async () => {
      const { data } = await apiClient.get('/futsal/grounds', { params: { limit: 200 } });
      return data;
    },
    enabled: reviews.length > 0,
  });
  const groundMap = Object.fromEntries(grounds.map((g) => [g.id, g]));

  const enriched: ReviewWithGround[] = reviews.map((r) => ({
    ...r,
    ground_name: groundMap[r.ground_id]?.name,
    ground_slug: groundMap[r.ground_id]?.slug,
  }));

  const deleteReview = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/futsal/reviews/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-reviews'] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Reviews</h1>
        <p className="text-sm text-gray-500">Reviews you've written for futsal grounds</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-4 w-1/3 mb-2" />
                <Skeleton className="h-3 w-full mb-1" />
                <Skeleton className="h-3 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="p-8 text-center text-red-500">
            Failed to load reviews. Please try again.
          </CardContent>
        </Card>
      ) : reviews.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">No reviews yet</p>
            <p className="text-sm text-gray-400 mt-1">
              After completing a booking, you can leave a review from My Bookings.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">{enriched.length} review{enriched.length !== 1 ? 's' : ''}</p>
          {enriched.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 text-sm font-semibold text-gray-900 mb-1">
                      <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      {review.ground_name
                        ? <a href={`/grounds/${review.ground_slug}`} className="hover:text-blue-600 transition-colors">{review.ground_name}</a>
                        : `Ground #${review.ground_id}`
                      }
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <StarDisplay rating={review.rating} />
                      {review.created_at && (
                        <span className="text-xs text-gray-400">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {review.comment && (
                      <p className="text-sm text-gray-700">{review.comment}</p>
                    )}
                    {review.owner_reply && (
                      <div className="mt-3 pl-3 border-l-2 border-blue-200">
                        <p className="text-xs font-medium text-blue-600 mb-0.5">Owner reply</p>
                        <p className="text-sm text-gray-600">{review.owner_reply}</p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => deleteReview.mutate(review.id)}
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
      )}
    </div>
  );
}
