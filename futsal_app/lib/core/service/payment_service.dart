import 'package:dio/dio.dart';
import 'package:url_launcher/url_launcher.dart';
import 'api_const.dart';
import 'api_service.dart';

class PaymentService {
  final ApiService _api = ApiService();

  /// Initiate Khalti payment for a booking
  Future<PaymentInitiationResponse> initiatePayment({
    required int bookingId,
    required String returnUrl,
    required String websiteUrl,
  }) async {
    try {
      final paymentData = {
        'bookingId': bookingId,
        'returnUrl': returnUrl,
        'websiteUrl': websiteUrl,
      };

      print('🔵 Payment Request Data: $paymentData');

      final res = await _api.post(ApiConst.initiatePayment, data: paymentData);

      if (res.statusCode == 200) {
        final data = res.data;
        return PaymentInitiationResponse(
          success: data['success'] ?? true,
          paymentUrl: data['paymentUrl'] ?? '',
          pidx: data['pidx'] ?? '',
          message: data['message'] ?? 'Payment initiated successfully',
        );
      } else {
        throw Exception('Failed to initiate payment: ${res.statusCode}');
      }
    } on DioException catch (e) {
      if (e.response != null) {
        final errorMsg =
            e.response?.data['message'] ??
            e.response?.data['title'] ??
            'Failed to initiate payment';
        throw Exception(errorMsg);
      } else {
        throw Exception('Network error: ${e.message}');
      }
    } catch (e) {
      throw Exception('Unexpected error: $e');
    }
  }

  /// Open payment URL in external browser
  Future<bool> openPaymentUrl(String paymentUrl) async {
    try {
      final uri = Uri.parse(paymentUrl);
      if (await canLaunchUrl(uri)) {
        return await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  /// Check payment status for a booking
  Future<PaymentStatus> checkPaymentStatus(int bookingId) async {
    try {
      final res = await _api.get('${ApiConst.bookings}/$bookingId');

      if (res.statusCode == 200) {
        final data = res.data;
        // Assuming the API returns payment status info
        final isPaid = data['isPaid'] ?? false;
        final paidAmount = data['paidAmount'] ?? 0.0;
        final totalAmount = data['totalAmount'] ?? 0.0;

        return PaymentStatus(
          isPaid: isPaid,
          paidAmount: paidAmount.toDouble(),
          totalAmount: totalAmount.toDouble(),
        );
      } else {
        throw Exception('Failed to check payment status');
      }
    } catch (e) {
      throw Exception('Failed to check payment status: $e');
    }
  }
}

class PaymentInitiationResponse {
  final bool success;
  final String paymentUrl;
  final String pidx;
  final String message;

  PaymentInitiationResponse({
    required this.success,
    required this.paymentUrl,
    required this.pidx,
    required this.message,
  });
}

class PaymentStatus {
  final bool isPaid;
  final double paidAmount;
  final double totalAmount;

  PaymentStatus({
    required this.isPaid,
    required this.paidAmount,
    required this.totalAmount,
  });

  double get remainingAmount => totalAmount - paidAmount;
  bool get isPartiallyPaid => paidAmount > 0 && paidAmount < totalAmount;
}
