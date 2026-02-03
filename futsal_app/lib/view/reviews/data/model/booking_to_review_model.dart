class BookingToReviewModel {
  int? id;
  String? userId;
  int? groundId;
  String? bookingDate;
  String? startTime;
  String? endTime;
  int? status;
  double? totalAmount;
  String? createdAt;
  String? groundName;
  bool? hasReview;

  BookingToReviewModel({
    this.id,
    this.userId,
    this.groundId,
    this.bookingDate,
    this.startTime,
    this.endTime,
    this.status,
    this.totalAmount,
    this.createdAt,
    this.groundName,
    this.hasReview,
  });

  BookingToReviewModel.fromJson(Map<String, dynamic> json) {
    id = json['id'];
    userId = json['userId'];
    groundId = json['groundId'];
    bookingDate = json['bookingDate'];
    startTime = json['startTime'];
    endTime = json['endTime'];
    status = json['status'];
    totalAmount = json['totalAmount']?.toDouble();
    createdAt = json['createdAt'];
    groundName = json['groundName'];
    hasReview = json['hasReview'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = <String, dynamic>{};
    data['id'] = id;
    data['userId'] = userId;
    data['groundId'] = groundId;
    data['bookingDate'] = bookingDate;
    data['startTime'] = startTime;
    data['endTime'] = endTime;
    data['status'] = status;
    data['totalAmount'] = totalAmount;
    data['createdAt'] = createdAt;
    data['groundName'] = groundName;
    data['hasReview'] = hasReview;
    return data;
  }
}
