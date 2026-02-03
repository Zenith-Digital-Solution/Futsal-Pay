part of 'reviews_bloc.dart';

abstract class ReviewsEvent extends Equatable {
  const ReviewsEvent();

  @override
  List<Object> get props => [];
}

class LoadReviews extends ReviewsEvent {}

class LoadRemainingBookings extends ReviewsEvent {}

class UpdateReview extends ReviewsEvent {
  final int reviewId;
  final int groundId;
  final int rating;
  final String? comment;
  final int? imageId;

  const UpdateReview({
    required this.reviewId,
    required this.groundId,
    required this.rating,
    this.comment,
    this.imageId,
  });

  @override
  List<Object> get props => [reviewId, groundId, rating];
}

class DeleteReview extends ReviewsEvent {
  final int reviewId;

  const DeleteReview(this.reviewId);

  @override
  List<Object> get props => [reviewId];
}

class CreateReviewFromBooking extends ReviewsEvent {
  final int bookingId;
  final int groundId;
  final int rating;
  final String? comment;
  final int? imageId;

  const CreateReviewFromBooking({
    required this.bookingId,
    required this.groundId,
    required this.rating,
    this.comment,
    this.imageId,
  });

  @override
  List<Object> get props => [bookingId, groundId, rating];
}
