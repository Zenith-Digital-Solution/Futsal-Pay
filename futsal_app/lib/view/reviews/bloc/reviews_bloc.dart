import 'package:bloc/bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:ui/view/reviews/data/model/reviews_model.dart';
import 'package:ui/view/reviews/data/model/booking_to_review_model.dart';
import 'package:ui/view/reviews/data/model/update_review_request.dart';
import 'package:ui/view/reviews/data/model/review_request.dart';
import 'package:ui/view/reviews/data/repository/reviews_repository.dart';

part 'reviews_event.dart';
part 'reviews_state.dart';

class ReviewsBloc extends Bloc<ReviewsEvent, ReviewsState> {
  final ReviewsRepository _reviewsRepository;

  ReviewsBloc({required ReviewsRepository reviewsRepository})
    : _reviewsRepository = reviewsRepository,
      super(ReviewsInitial()) {
    on<LoadReviews>(_onLoadReviews);
    on<LoadRemainingBookings>(_onLoadRemainingBookings);
    on<UpdateReview>(_onUpdateReview);
    on<DeleteReview>(_onDeleteReview);
    on<CreateReviewFromBooking>(_onCreateReviewFromBooking);
  }

  Future<void> _onLoadReviews(
    LoadReviews event,
    Emitter<ReviewsState> emit,
  ) async {
    emit(ReviewsLoading());
    try {
      final reviews = await _reviewsRepository.fetchReviews();
      final remainingBookings = await _reviewsRepository
          .fetchRemainingBookings();
      emit(ReviewsLoaded(reviews, remainingBookings));
    } catch (e) {
      emit(ReviewsError(e.toString()));
    }
  }

  Future<void> _onLoadRemainingBookings(
    LoadRemainingBookings event,
    Emitter<ReviewsState> emit,
  ) async {
    try {
      final remainingBookings = await _reviewsRepository
          .fetchRemainingBookings();
      final reviews = await _reviewsRepository.fetchReviews();
      emit(ReviewsLoaded(reviews, remainingBookings));
    } catch (e) {
      emit(ReviewsError(e.toString()));
    }
  }

  Future<void> _onUpdateReview(
    UpdateReview event,
    Emitter<ReviewsState> emit,
  ) async {
    emit(ReviewActionInProgress());
    try {
      final request = UpdateReviewRequest(
        groundId: event.groundId,
        rating: event.rating,
        comment: event.comment,
        imageId: event.imageId,
      );
      await _reviewsRepository.updateReview(event.reviewId, request);
      emit(const ReviewActionSuccess('Review updated successfully'));

      // Reload reviews
      final reviews = await _reviewsRepository.fetchReviews();
      final remainingBookings = await _reviewsRepository
          .fetchRemainingBookings();
      emit(ReviewsLoaded(reviews, remainingBookings));
    } catch (e) {
      emit(ReviewActionError(e.toString()));
    }
  }

  Future<void> _onDeleteReview(
    DeleteReview event,
    Emitter<ReviewsState> emit,
  ) async {
    emit(ReviewActionInProgress());
    try {
      await _reviewsRepository.deleteReview(event.reviewId);
      emit(const ReviewActionSuccess('Review deleted successfully'));

      // Reload reviews
      final reviews = await _reviewsRepository.fetchReviews();
      final remainingBookings = await _reviewsRepository
          .fetchRemainingBookings();
      emit(ReviewsLoaded(reviews, remainingBookings));
    } catch (e) {
      emit(ReviewActionError(e.toString()));
    }
  }

  Future<void> _onCreateReviewFromBooking(
    CreateReviewFromBooking event,
    Emitter<ReviewsState> emit,
  ) async {
    emit(ReviewActionInProgress());
    try {
      final request = ReviewRequest(
        bookingId: event.bookingId,
        rating: event.rating,
        comment: event.comment,
        imageId: event.imageId,
      );
      await _reviewsRepository.createReview(request);
      emit(const ReviewActionSuccess('Review submitted successfully'));

      // Reload reviews
      final reviews = await _reviewsRepository.fetchReviews();
      final remainingBookings = await _reviewsRepository
          .fetchRemainingBookings();
      emit(ReviewsLoaded(reviews, remainingBookings));
    } catch (e) {
      emit(ReviewActionError(e.toString()));
    }
  }
}
