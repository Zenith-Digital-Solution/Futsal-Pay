import 'package:dio/dio.dart';
import 'package:ui/core/service/api_const.dart';
import 'package:ui/core/service/api_service.dart';
import '../model/booking.dart';

class BookingRepository {
  final ApiService _api = ApiService();

  Future<List<Booking>> getBookings() async {
    try {
      final res = await _api.get(ApiConst.bookings);
      if (res.statusCode == 200) {
        final data = res.data;
        if (data is List) {
          return data
              .map((e) => Booking.fromJson(e as Map<String, dynamic>))
              .toList();
        } else if (data is Map && data['items'] is List) {
          return (data['items'] as List)
              .map((e) => Booking.fromJson(e as Map<String, dynamic>))
              .toList();
        } else {
          return [];
        }
      } else {
        throw Exception('Failed to load bookings: ${res.statusCode}');
      }
    } on DioException catch (e) {
      if (e.response != null) {
        throw Exception(
          e.response?.data['message'] ?? 'Failed to load bookings',
        );
      } else {
        throw Exception('Network error: ${e.message}');
      }
    } catch (e) {
      throw Exception('Unexpected error: $e');
    }
  }

  /// Create a new booking
  Future<int> createBooking({
    required String userId,
    required int groundId,
    required DateTime bookingDate,
    required String startTime,
    required String endTime,
  }) async {
    try {
      final bookingData = {
        'userId': userId,
        'groundId': groundId,
        'bookingDate': bookingDate.toIso8601String(),
        'startTime': startTime,
        'endTime': endTime,
      };

      final res = await _api.post(ApiConst.bookings, data: bookingData);

      print('🔵 Booking Response: ${res.data}');

      if (res.statusCode == 200 || res.statusCode == 201) {
        // Extract booking ID from response
        final responseData = res.data;
        if (responseData is Map && responseData['id'] != null) {
          final bookingId = responseData['id'] as int;
          print('🟢 Booking ID from response: $bookingId');
          return bookingId;
        } else if (responseData is Map && responseData['bookingId'] != null) {
          final bookingId = responseData['bookingId'] as int;
          print('🟢 Booking ID from response: $bookingId');
          return bookingId;
        }
        // If no ID in response, return 0 (will be handled gracefully)
        print('🔴 WARNING: No booking ID found in response! Returning 0');
        return 0;
      } else {
        throw Exception('Failed to create booking: ${res.statusCode}');
      }
    } on DioException catch (e) {
      if (e.response != null) {
        throw Exception(
          e.response?.data['message'] ?? 'Failed to create booking',
        );
      } else {
        throw Exception('Network error: ${e.message}');
      }
    } catch (e) {
      throw Exception('Unexpected error: $e');
    }
  }

  /// Cancel a booking
  Future<void> cancelBooking(int bookingId) async {
    try {
      final res = await _api.patch('${ApiConst.bookings}/cancel/$bookingId');

      if (res.statusCode == 200) {
        return;
      } else {
        throw Exception('Failed to cancel booking: ${res.statusCode}');
      }
    } on DioException catch (e) {
      if (e.response != null) {
        throw Exception(
          e.response?.data['message'] ?? 'Failed to cancel booking',
        );
      } else {
        throw Exception('Network error: ${e.message}');
      }
    } catch (e) {
      throw Exception('Unexpected error: $e');
    }
  }
}
