class Booking {
  final int id;
  final String userId;
  final int groundId;
  final DateTime bookingDate;
  final String startTime; // assuming HH:mm or full string from API
  final String endTime;
  final int
  status; // 0=pending, 1=confirmed, 2=upcoming, 3=cancelled, 4=completed
  final double totalAmount;
  final DateTime createdAt;
  final String groundName;
  final bool isPaid;
  final double paidAmount;

  Booking({
    required this.id,
    required this.userId,
    required this.groundId,
    required this.bookingDate,
    required this.startTime,
    required this.endTime,
    required this.status,
    required this.totalAmount,
    required this.createdAt,
    required this.groundName,
    this.isPaid = false,
    this.paidAmount = 0.0,
  });

  factory Booking.fromJson(Map<String, dynamic> json) {
    return Booking(
      id: json['id'] ?? 0,
      userId: json['userId'] ?? '',
      groundId: json['groundId'] ?? 0,
      bookingDate:
          DateTime.tryParse(json['bookingDate'] ?? '') ?? DateTime.now(),
      startTime: json['startTime'] ?? '',
      endTime: json['endTime'] ?? '',
      status: json['status'] ?? 0,
      totalAmount: (json['totalAmount'] is int)
          ? (json['totalAmount'] as int).toDouble()
          : (json['totalAmount'] is double)
          ? json['totalAmount']
          : 0.0,
      createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
      groundName: json['groundName'] ?? '',
      isPaid: json['isPaid'] ?? false,
      paidAmount: (json['paidAmount'] is int)
          ? (json['paidAmount'] as int).toDouble()
          : (json['paidAmount'] is double)
          ? json['paidAmount']
          : 0.0,
    );
  }

  double get remainingAmount => totalAmount - paidAmount;
}
