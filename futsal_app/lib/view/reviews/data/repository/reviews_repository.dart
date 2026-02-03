import 'package:ui/core/service/api_const.dart';
import 'package:ui/core/service/api_service.dart';
import 'package:ui/view/reviews/data/model/reviews_model.dart';
import 'package:ui/view/reviews/data/model/review_request.dart';
import 'package:ui/view/reviews/data/model/booking_to_review_model.dart';
import 'package:ui/view/reviews/data/model/update_review_request.dart';

class ReviewsRepository {
  final ApiService _apiService;

  ReviewsRepository({ApiService? apiService})
    : _apiService = apiService ?? ApiService();

  Future<List<ReviewsModel>> fetchReviews() async {
    try {
      final response = await _apiService.get(ApiConst.reviews);
      if (response.statusCode == 200) {
        final List<dynamic> data = response.data;
        return data.map((json) => ReviewsModel.fromJson(json)).toList();
      } else {
        throw Exception('Failed to load reviews');
      }
    } catch (e) {
      throw Exception('Failed to load reviews: $e');
    }
  }

  Future<List<BookingToReviewModel>> fetchRemainingBookings() async {
    try {
      final response = await _apiService.get(ApiConst.reviewsRemainingList);
      if (response.statusCode == 200) {
        final List<dynamic> data = response.data;
        return data.map((json) => BookingToReviewModel.fromJson(json)).toList();
      } else {
        throw Exception('Failed to load bookings to review');
      }
    } catch (e) {
      throw Exception('Failed to load bookings to review: $e');
    }
  }

  Future<void> createReview(ReviewRequest reviewRequest) async {
    try {
      final response = await _apiService.post(
        ApiConst.reviews,
        data: reviewRequest.toJson(),
      );
      if (response.statusCode == 200) {
        // API returns a success message string, not an ID
        return;
      } else {
        throw Exception('Failed to create review');
      }
    } catch (e) {
      throw Exception('Failed to create review: $e');
    }
  }

  Future<void> updateReview(int reviewId, UpdateReviewRequest request) async {
    try {
      final response = await _apiService.put(
        ApiConst.reviewById(reviewId),
        data: request.toJson(),
      );
      if (response.statusCode == 200) {
        return;
      } else {
        throw Exception('Failed to update review');
      }
    } catch (e) {
      throw Exception('Failed to update review: $e');
    }
  }

  Future<void> deleteReview(int reviewId) async {
    try {
      final response = await _apiService.delete(ApiConst.reviewById(reviewId));
      if (response.statusCode == 204 || response.statusCode == 200) {
        return;
      } else {
        throw Exception('Failed to delete review');
      }
    } catch (e) {
      throw Exception('Failed to delete review: $e');
    }
  }
}
