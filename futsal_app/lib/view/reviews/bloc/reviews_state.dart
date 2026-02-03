part of 'reviews_bloc.dart';

abstract class ReviewsState extends Equatable {
  const ReviewsState();

  @override
  List<Object> get props => [];
}

class ReviewsInitial extends ReviewsState {}

class ReviewsLoading extends ReviewsState {}

class ReviewsLoaded extends ReviewsState {
  final List<ReviewsModel> reviews;
  final List<BookingToReviewModel> remainingBookings;

  const ReviewsLoaded(this.reviews, this.remainingBookings);

  @override
  List<Object> get props => [reviews, remainingBookings];
}

class ReviewsError extends ReviewsState {
  final String message;

  const ReviewsError(this.message);

  @override
  List<Object> get props => [message];
}

class ReviewActionInProgress extends ReviewsState {}

class ReviewActionSuccess extends ReviewsState {
  final String message;

  const ReviewActionSuccess(this.message);

  @override
  List<Object> get props => [message];
}

class ReviewActionError extends ReviewsState {
  final String message;

  const ReviewActionError(this.message);

  @override
  List<Object> get props => [message];
}
