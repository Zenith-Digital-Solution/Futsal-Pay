import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:ui/core/dimension.dart';
import 'package:ui/core/service/api_const.dart';
import 'package:ui/view/reviews/bloc/reviews_bloc.dart';
import 'package:ui/view/reviews/data/model/reviews_model.dart';
import 'package:ui/view/reviews/data/model/booking_to_review_model.dart';
import 'package:ui/view/reviews/data/repository/reviews_repository.dart';
import 'package:ui/view/reviews/widgets/create_review_dialog.dart';
import 'package:ui/view/reviews/widgets/edit_review_dialog.dart';

class Reviews extends StatelessWidget {
  const Reviews({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) =>
          ReviewsBloc(reviewsRepository: ReviewsRepository())
            ..add(LoadReviews()),
      child: Scaffold(
        appBar: AppBar(
          title: Text(
            'Reviews',
            style: TextStyle(fontSize: Dimension.font(20)),
          ),
        ),
        body: BlocConsumer<ReviewsBloc, ReviewsState>(
          listener: (context, state) {
            if (state is ReviewActionSuccess) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(state.message),
                  backgroundColor: Colors.green,
                  behavior: SnackBarBehavior.floating,
                ),
              );
            } else if (state is ReviewActionError) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(state.message),
                  backgroundColor: Colors.red,
                  behavior: SnackBarBehavior.floating,
                ),
              );
            }
          },
          builder: (context, state) {
            if (state is ReviewsLoading || state is ReviewActionInProgress) {
              return const Center(child: CircularProgressIndicator());
            } else if (state is ReviewsLoaded) {
              return RefreshIndicator(
                onRefresh: () async {
                  context.read<ReviewsBloc>().add(LoadReviews());
                  await Future.delayed(const Duration(milliseconds: 500));
                },
                child: DefaultTabController(
                  length: 2,
                  child: Column(
                    children: [
                      Container(
                        color: Theme.of(context).colorScheme.surface,
                        child: TabBar(
                          tabs: [
                            Tab(text: 'My Reviews (${state.reviews.length})'),
                            Tab(
                              text:
                                  'To Be Reviewed (${state.remainingBookings.length})',
                            ),
                          ],
                        ),
                      ),
                      Expanded(
                        child: TabBarView(
                          children: [
                            _buildMyReviewsTab(context, state.reviews),
                            _buildToBeReviewedTab(
                              context,
                              state.remainingBookings,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            } else if (state is ReviewsError) {
              return RefreshIndicator(
                onRefresh: () async {
                  context.read<ReviewsBloc>().add(LoadReviews());
                  await Future.delayed(const Duration(milliseconds: 500));
                },
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  children: [
                    SizedBox(height: Dimension.height(200)),
                    Center(
                      child: Text(
                        state.message,
                        style: TextStyle(fontSize: Dimension.font(14)),
                      ),
                    ),
                  ],
                ),
              );
            }
            return const SizedBox.shrink();
          },
        ),
      ),
    );
  }

  Widget _buildMyReviewsTab(BuildContext context, List<ReviewsModel> reviews) {
    if (reviews.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          SizedBox(height: Dimension.height(200)),
          Center(
            child: Text(
              "You haven't posted any reviews yet.",
              style: TextStyle(fontSize: Dimension.font(16)),
            ),
          ),
        ],
      );
    }

    return ListView.builder(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: EdgeInsets.all(Dimension.width(16.0)),
      itemCount: reviews.length,
      itemBuilder: (context, index) {
        final review = reviews[index];
        return MyReviewCard(review: review);
      },
    );
  }

  Widget _buildToBeReviewedTab(
    BuildContext context,
    List<BookingToReviewModel> bookings,
  ) {
    // Filter to only show bookings without reviews
    final toReview = bookings.where((b) => b.hasReview == false).toList();

    if (toReview.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          SizedBox(height: Dimension.height(200)),
          Center(
            child: Text(
              "No bookings pending review.",
              style: TextStyle(fontSize: Dimension.font(16)),
            ),
          ),
        ],
      );
    }

    return ListView.builder(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: EdgeInsets.all(Dimension.width(16.0)),
      itemCount: toReview.length,
      itemBuilder: (context, index) {
        final booking = toReview[index];
        return BookingToReviewCard(booking: booking);
      },
    );
  }
}

class MyReviewCard extends StatelessWidget {
  final ReviewsModel review;

  const MyReviewCard({super.key, required this.review});

  @override
  Widget build(BuildContext context) {
    final dateTime = DateTime.tryParse(review.createdAt ?? '');
    final formattedDate = dateTime != null
        ? DateFormat.yMMMd().format(dateTime)
        : '';

    return Card(
      margin: EdgeInsets.only(bottom: Dimension.height(16.0)),
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(Dimension.width(12)),
      ),
      child: Padding(
        padding: EdgeInsets.all(Dimension.width(16.0)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        review.groundName ?? 'Unknown Ground',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: Dimension.font(16),
                        ),
                      ),
                      if (formattedDate.isNotEmpty)
                        Text(
                          formattedDate,
                          style: TextStyle(
                            color: Colors.grey[600],
                            fontSize: Dimension.font(12),
                          ),
                        ),
                    ],
                  ),
                ),
                Container(
                  padding: EdgeInsets.symmetric(
                    horizontal: Dimension.width(8),
                    vertical: Dimension.height(4),
                  ),
                  decoration: BoxDecoration(
                    color: Colors.amber.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(Dimension.width(12)),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.star,
                        color: Colors.amber,
                        size: Dimension.width(16),
                      ),
                      SizedBox(width: Dimension.width(4)),
                      Text(
                        review.rating?.toString() ?? '0',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Colors.amber,
                          fontSize: Dimension.font(14),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            SizedBox(height: Dimension.height(12)),
            Text(
              review.comment ?? '',
              style: TextStyle(fontSize: Dimension.font(14)),
            ),
            if (review.reviewImageUrl != null &&
                review.reviewImageUrl!.isNotEmpty) ...[
              SizedBox(height: Dimension.height(12)),
              ClipRRect(
                borderRadius: BorderRadius.circular(Dimension.width(8)),
                child: Image.network(
                  '${ApiConst.baseUrl}${review.reviewImageUrl}',
                  height: Dimension.height(150),
                  width: double.infinity,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) =>
                      const SizedBox.shrink(),
                ),
              ),
            ],
            SizedBox(height: Dimension.height(12)),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton.icon(
                  onPressed: () {
                    showDialog(
                      context: context,
                      builder: (dialogContext) => EditReviewDialog(
                        review: review,
                        onUpdate: (groundId, rating, comment, imageId) {
                          context.read<ReviewsBloc>().add(
                            UpdateReview(
                              reviewId: review.id!,
                              groundId: groundId,
                              rating: rating,
                              comment: comment,
                              imageId: imageId,
                            ),
                          );
                        },
                      ),
                    );
                  },
                  icon: Icon(Icons.edit, size: Dimension.width(18)),
                  label: Text('Edit'),
                ),
                SizedBox(width: Dimension.width(8)),
                TextButton.icon(
                  onPressed: () {
                    _showDeleteDialog(context, review.id!);
                  },
                  icon: Icon(
                    Icons.delete,
                    size: Dimension.width(18),
                    color: Colors.red,
                  ),
                  label: Text('Delete', style: TextStyle(color: Colors.red)),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showDeleteDialog(BuildContext context, int reviewId) {
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(Dimension.width(16)),
        ),
        title: Text(
          'Delete Review',
          style: TextStyle(
            fontSize: Dimension.font(18),
            fontWeight: FontWeight.w700,
          ),
        ),
        content: Text(
          'Are you sure you want to delete this review?',
          style: TextStyle(
            fontSize: Dimension.font(14),
            fontWeight: FontWeight.w400,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: Text(
              'Cancel',
              style: TextStyle(
                fontSize: Dimension.font(14),
                fontWeight: FontWeight.w600,
                color: Colors.grey[600],
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(dialogContext).pop();
              context.read<ReviewsBloc>().add(DeleteReview(reviewId));
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(Dimension.width(8)),
              ),
            ),
            child: Text(
              'Delete',
              style: TextStyle(
                fontSize: Dimension.font(14),
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class BookingToReviewCard extends StatelessWidget {
  final BookingToReviewModel booking;

  const BookingToReviewCard({super.key, required this.booking});

  @override
  Widget build(BuildContext context) {
    final dateTime = DateTime.tryParse(booking.bookingDate ?? '');
    final formattedDate = dateTime != null
        ? DateFormat.yMMMd().format(dateTime)
        : '';

    return Card(
      margin: EdgeInsets.only(bottom: Dimension.height(16.0)),
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(Dimension.width(12)),
      ),
      child: Padding(
        padding: EdgeInsets.all(Dimension.width(16.0)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        booking.groundName ?? 'Unknown Ground',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: Dimension.font(16),
                        ),
                      ),
                      SizedBox(height: Dimension.height(4)),
                      Text(
                        formattedDate,
                        style: TextStyle(
                          color: Colors.grey[600],
                          fontSize: Dimension.font(12),
                        ),
                      ),
                      Text(
                        '${booking.startTime} - ${booking.endTime}',
                        style: TextStyle(
                          color: Colors.grey[600],
                          fontSize: Dimension.font(12),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            SizedBox(height: Dimension.height(12)),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Total: Rs.${booking.totalAmount?.truncate() ?? 0}',
                  style: TextStyle(
                    fontSize: Dimension.font(12),
                    fontWeight: FontWeight.w400,
                  ),
                ),
                ElevatedButton.icon(
                  onPressed: () {
                    showDialog(
                      context: context,
                      builder: (dialogContext) => CreateReviewDialog(
                        bookingId: booking.id!,
                        groundId: booking.groundId!,
                        groundName: booking.groundName ?? 'Ground',
                        onCreate:
                            (bookingId, groundId, rating, comment, imageId) {
                              context.read<ReviewsBloc>().add(
                                CreateReviewFromBooking(
                                  bookingId: bookingId,
                                  groundId: groundId,
                                  rating: rating,
                                  comment: comment,
                                  imageId: imageId,
                                ),
                              );
                            },
                      ),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Theme.of(context).colorScheme.primary,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    padding: EdgeInsets.symmetric(
                      horizontal: Dimension.width(12),
                      vertical: Dimension.height(8),
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(Dimension.width(8)),
                    ),
                  ),
                  icon: Icon(Icons.rate_review, size: Dimension.width(16)),
                  label: Text(
                    'Review',
                    style: TextStyle(
                      fontSize: Dimension.font(14),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
