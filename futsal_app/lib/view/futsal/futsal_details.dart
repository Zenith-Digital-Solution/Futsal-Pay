import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shimmer/shimmer.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/dimension.dart';
import '../book_now/book_now.dart';
import 'map_screen.dart';
import '../favorite/bloc/favorite_bloc.dart';
import '../favorite/bloc/favorite_event.dart';
import '../home/data/repository/futsal_repository.dart';
import '../home/data/model/futsal_model.dart';
import '../../core/service/api_const.dart';

class FutsalDetails extends StatefulWidget {
  final int futsalId;

  const FutsalDetails({super.key, required this.futsalId});

  @override
  State<FutsalDetails> createState() => _FutsalDetailsState();
}

class _FutsalDetailsState extends State<FutsalDetails> {
  final FutsalRepository _repository = FutsalRepository();
  FutsalModel? _futsalData;
  bool _isLoading = true;
  String? _error;
  bool _isFavorite = false;
  bool _isFavoriteLoading = false;

  @override
  void initState() {
    super.initState();
    _loadFutsalDetails();
  }

  Future<void> _loadFutsalDetails() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final data = await _repository.getFutsalById(widget.futsalId);
      setState(() {
        _futsalData = data;
        _isFavorite = data.isFavorite;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  void _toggleFavorite() async {
    if (_isFavoriteLoading) return;

    // Show confirmation dialog when removing from favorites
    if (_isFavorite) {
      final confirm = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(Dimension.width(16)),
          ),
          title: Text(
            'Remove from Favorites?',
            style: TextStyle(
              fontSize: Dimension.font(18),
              fontWeight: FontWeight.bold,
            ),
          ),
          content: Text(
            'Are you sure you want to remove this court from your favorites?',
            style: TextStyle(fontSize: Dimension.font(14)),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: Text(
                'Cancel',
                style: TextStyle(
                  color: Colors.grey,
                  fontSize: Dimension.font(14),
                ),
              ),
            ),
            TextButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: Text(
                'Remove',
                style: TextStyle(
                  color: Colors.red,
                  fontSize: Dimension.font(14),
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
      );

      if (confirm != true) return;
    }

    setState(() => _isFavoriteLoading = true);

    try {
      if (_isFavorite) {
        context.read<FavoriteBloc>().add(RemoveFromFavorites(widget.futsalId));
      } else {
        context.read<FavoriteBloc>().add(AddToFavorites(widget.futsalId));
      }

      await Future.delayed(const Duration(milliseconds: 300));

      setState(() {
        _isFavorite = !_isFavorite;
        _isFavoriteLoading = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              _isFavorite ? 'Added to favorites' : 'Removed from favorites',
            ),
            duration: const Duration(seconds: 2),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      setState(() => _isFavoriteLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to update favorites: $e'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 2),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  void _showReviewsDialog() {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(Dimension.width(16)),
        ),
        child: Container(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.75,
            maxWidth: Dimension.isTablet ? 600 : double.infinity,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(
                padding: EdgeInsets.all(Dimension.width(16)),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Reviews (${_futsalData!.reviews!.length})',
                      style: TextStyle(
                        fontSize: Dimension.font(18),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(context),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                  ],
                ),
              ),
              Divider(height: 1),
              Flexible(
                child: ListView.separated(
                  shrinkWrap: true,
                  padding: EdgeInsets.all(Dimension.width(16)),
                  itemCount: _futsalData!.reviews!.length,
                  separatorBuilder: (context, index) =>
                      SizedBox(height: Dimension.height(12)),
                  itemBuilder: (context, index) {
                    final review = _futsalData!.reviews![index];
                    return _buildReviewCard(review);
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _fmtTime(String raw) {
    final s = raw.trim();
    final sec = RegExp(r'^(\d{2}):(\d{2}):(\d{2})$').firstMatch(s);
    if (sec != null) {
      final h = int.parse(sec.group(1)!);
      final m = sec.group(2)!;
      final period = h >= 12 ? 'PM' : 'AM';
      int h12 = h % 12;
      if (h12 == 0) h12 = 12;
      return '${h12.toString().padLeft(2, '0')}:$m $period';
    }
    final noSec = RegExp(r'^(\d{2}):(\d{2})$').firstMatch(s);
    if (noSec != null) {
      final h = int.parse(noSec.group(1)!);
      final m = noSec.group(2)!;
      final period = h >= 12 ? 'PM' : 'AM';
      int h12 = h % 12;
      if (h12 == 0) h12 = 12;
      return '${h12.toString().padLeft(2, '0')}:$m $period';
    }
    return s;
  }

  @override
  Widget build(BuildContext context) {
    Dimension.init(context);

    if (_error != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Error')),
        body: Center(
          child: Padding(
            padding: EdgeInsets.all(Dimension.width(24)),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.error_outline,
                  size: Dimension.width(64),
                  color: Colors.red,
                ),
                SizedBox(height: Dimension.height(16)),
                Text(
                  'Failed to load details',
                  style: TextStyle(
                    fontSize: Dimension.font(18),
                    fontWeight: FontWeight.bold,
                  ),
                ),
                SizedBox(height: Dimension.height(8)),
                Text(
                  _error!,
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: Dimension.font(14)),
                ),
                SizedBox(height: Dimension.height(24)),
                ElevatedButton(
                  onPressed: _loadFutsalDetails,
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: _isLoading ? _buildShimmerLoading() : _buildContent(),
      bottomNavigationBar: !_isLoading && _futsalData != null
          ? Container(
              padding: EdgeInsets.all(Dimension.width(16)),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.1),
                    blurRadius: 8,
                    offset: const Offset(0, -2),
                  ),
                ],
              ),
              child: SafeArea(
                child: Row(
                  children: [
                    Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Starting from',
                          style: TextStyle(
                            fontSize: Dimension.font(12),
                            color: Theme.of(
                              context,
                            ).colorScheme.onPrimary.withValues(alpha: 0.6),
                          ),
                        ),
                        Row(
                          children: [
                            Text(
                              'Rs.${_futsalData!.pricePerHour}',
                              style: TextStyle(
                                fontSize: Dimension.font(15),
                                color: Theme.of(context).primaryColor,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            Text(
                              '/hour',
                              style: TextStyle(
                                fontSize: Dimension.font(12),
                                color: Theme.of(
                                  context,
                                ).colorScheme.onPrimary.withValues(alpha: 0.6),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    SizedBox(width: Dimension.width(16)),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) =>
                                  BookNow(futsalData: _futsalData!.toMap()),
                            ),
                          );
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Theme.of(context).primaryColor,
                          foregroundColor: Colors.white,
                          elevation: 3,
                          shadowColor: const Color(0xFF00C853).withOpacity(0.4),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(
                              Dimension.width(8),
                            ),
                          ),
                          padding: EdgeInsets.symmetric(
                            vertical: Dimension.height(12),
                          ),
                        ),
                        child: Text(
                          'Book Now',
                          style: TextStyle(
                            fontSize: Dimension.font(15),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            )
          : null,
    );
  }

  Widget _buildShimmerLoading() {
    return CustomScrollView(
      slivers: [
        SliverAppBar(
          expandedHeight: Dimension.height(300),
          pinned: true,
          backgroundColor: Colors.white,
          leading: Padding(
            padding: EdgeInsets.all(Dimension.width(8)),
            child: Container(
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                shape: BoxShape.circle,
              ),
              child: IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => Navigator.pop(context),
              ),
            ),
          ),
          flexibleSpace: FlexibleSpaceBar(
            background: Shimmer.fromColors(
              baseColor: Colors.grey[300]!,
              highlightColor: Colors.grey[100]!,
              child: Container(color: Colors.white),
            ),
          ),
        ),
        SliverToBoxAdapter(
          child: Padding(
            padding: EdgeInsets.all(Dimension.width(16)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildShimmerBox(height: 24, width: 200),
                SizedBox(height: Dimension.height(8)),
                _buildShimmerBox(height: 16, width: 150),
                SizedBox(height: Dimension.height(24)),
                _buildShimmerBox(height: 16, width: double.infinity),
                SizedBox(height: Dimension.height(8)),
                _buildShimmerBox(height: 16, width: double.infinity),
                SizedBox(height: Dimension.height(8)),
                _buildShimmerBox(height: 16, width: 250),
                SizedBox(height: Dimension.height(24)),
                _buildShimmerBox(height: 80, width: double.infinity),
                SizedBox(height: Dimension.height(24)),
                _buildShimmerBox(height: 150, width: double.infinity),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildShimmerBox({required double height, required double width}) {
    return Shimmer.fromColors(
      baseColor: Colors.grey[300]!,
      highlightColor: Colors.grey[100]!,
      child: Container(
        height: height,
        width: width,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(Dimension.width(8)),
        ),
      ),
    );
  }

  Widget _buildContent() {
    if (_futsalData == null) return const SizedBox.shrink();

    return CustomScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      slivers: [
        // App Bar with Image
        SliverAppBar(
          expandedHeight: Dimension.height(300),
          pinned: true,
          backgroundColor: Colors.white,
          leading: Padding(
            padding: EdgeInsets.all(Dimension.width(8)),
            child: Container(
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.1),
                    blurRadius: Dimension.width(8),
                  ),
                ],
              ),
              child: IconButton(
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                icon: Icon(
                  Icons.arrow_back,
                  color: Theme.of(context).colorScheme.onSurface,
                  size: Dimension.width(18),
                ),
                onPressed: () => Navigator.pop(context),
              ),
            ),
          ),
          actions: [
            Padding(
              padding: EdgeInsets.all(Dimension.width(8)),
              child: Container(
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surface,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: Dimension.width(8),
                    ),
                  ],
                ),
                child: _isFavoriteLoading
                    ? Padding(
                        padding: EdgeInsets.all(Dimension.width(12)),
                        child: SizedBox(
                          width: Dimension.width(18),
                          height: Dimension.width(18),
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(
                              Theme.of(context).primaryColor,
                            ),
                          ),
                        ),
                      )
                    : IconButton(
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                        icon: Icon(
                          _isFavorite ? Icons.favorite : Icons.favorite_border,
                          color: _isFavorite
                              ? Colors.red
                              : Theme.of(context).colorScheme.onSurface,
                          size: Dimension.width(22),
                        ),
                        onPressed: _toggleFavorite,
                      ),
              ),
            ),
          ],
          flexibleSpace: FlexibleSpaceBar(
            background: Stack(
              fit: StackFit.expand,
              children: [
                if (_futsalData!.imageUrl.isNotEmpty)
                  Image.network(
                    _futsalData!.imageUrl,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) {
                      return Container(
                        color: Colors.grey[200],
                        child: Icon(
                          Icons.sports_soccer,
                          size: Dimension.width(80),
                          color: Colors.grey[400],
                        ),
                      );
                    },
                  )
                else
                  Container(
                    color: Colors.grey[200],
                    child: Icon(
                      Icons.sports_soccer,
                      size: Dimension.width(80),
                      color: Colors.grey[400],
                    ),
                  ),
                Positioned.fill(
                  child: DecoratedBox(
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Colors.transparent,
                          Color.fromARGB(120, 0, 0, 0),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),

        // Content
        SliverToBoxAdapter(
          child: Padding(
            padding: EdgeInsets.all(Dimension.width(16)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Name, Rating and Map View
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _futsalData!.name,
                            style: TextStyle(
                              fontSize: Dimension.font(20),
                              fontWeight: FontWeight.w400,
                              color: Theme.of(context).colorScheme.onPrimary,
                            ),
                          ),
                          SizedBox(height: Dimension.height(8)),
                          Row(
                            children: [
                              Icon(
                                Icons.star,
                                size: Dimension.width(18),
                                color: const Color(0xFFFFA500),
                              ),
                              SizedBox(width: Dimension.width(6)),
                              Text(
                                _futsalData!.averageRating.toStringAsFixed(1),
                                style: TextStyle(
                                  fontSize: Dimension.font(14),
                                  fontWeight: FontWeight.w400,
                                  color: Theme.of(
                                    context,
                                  ).colorScheme.onPrimary,
                                ),
                              ),
                              SizedBox(width: Dimension.width(8)),
                              GestureDetector(
                                onTap: () {
                                  if (_futsalData!.reviews != null &&
                                      _futsalData!.reviews!.isNotEmpty) {
                                    _showReviewsDialog();
                                  } else {
                                    // Show message when no reviews available
                                    showDialog(
                                      context: context,
                                      builder: (context) => AlertDialog(
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(
                                            Dimension.width(16),
                                          ),
                                        ),
                                        title: Row(
                                          children: [
                                            Icon(
                                              Icons.info_outline,
                                              color: Theme.of(
                                                context,
                                              ).primaryColor,
                                            ),
                                            SizedBox(
                                              width: Dimension.width(12),
                                            ),
                                            Text(
                                              'No Reviews Yet',
                                              style: TextStyle(
                                                fontSize: Dimension.font(18),
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                          ],
                                        ),
                                        content: Text(
                                          'This futsal ground doesn\'t have any reviews yet. Be the first to leave a review after booking!',
                                          style: TextStyle(
                                            fontSize: Dimension.font(14),
                                            color: Theme.of(context)
                                                .colorScheme
                                                .onPrimary
                                                .withValues(alpha: 0.7),
                                          ),
                                        ),
                                        actions: [
                                          TextButton(
                                            onPressed: () =>
                                                Navigator.pop(context),
                                            child: Text(
                                              'OK',
                                              style: TextStyle(
                                                fontSize: Dimension.font(14),
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    );
                                  }
                                },
                                child: Text(
                                  '(${_futsalData!.ratingCount} reviews)',
                                  style: TextStyle(
                                    fontSize: Dimension.font(12),
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onPrimary
                                        .withValues(alpha: 0.6),
                                    decoration: TextDecoration.underline,
                                  ),
                                ),
                              ),
                              SizedBox(width: Dimension.width(16)),
                              Container(
                                padding: EdgeInsets.symmetric(
                                  horizontal: Dimension.width(8),
                                  vertical: Dimension.height(4),
                                ),
                                decoration: BoxDecoration(
                                  color: Theme.of(
                                    context,
                                  ).primaryColor.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(
                                    Dimension.width(12),
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    Icon(
                                      Icons.event_available,
                                      size: Dimension.width(14),
                                      color: Theme.of(context).primaryColor,
                                    ),
                                    SizedBox(width: Dimension.width(4)),
                                    Text(
                                      '${_futsalData!.bookingCount} bookings',
                                      style: TextStyle(
                                        fontSize: Dimension.font(12),
                                        fontWeight: FontWeight.w500,
                                        color: Theme.of(context).primaryColor,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    GestureDetector(
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => FutsalMapScreen(
                              futsalData: _futsalData!.toMap(),
                            ),
                          ),
                        );
                      },
                      child: Column(
                        children: [
                          Image.asset(
                            'assets/icons/map.png',
                            width: Dimension.width(20),
                            height: Dimension.width(20),
                          ),
                          Text(
                            'view',
                            style: TextStyle(
                              fontSize: Dimension.font(12),
                              color: Theme.of(
                                context,
                              ).colorScheme.onPrimary.withValues(alpha: 0.6),
                              fontWeight: FontWeight.w400,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                SizedBox(height: Dimension.height(24)),

                // Location
                _buildInfoCard(
                  icon: Icons.location_on,
                  title: 'Location',
                  content: _futsalData!.location,
                ),

                SizedBox(height: Dimension.height(16)),

                // Opening Hours
                _buildInfoCard(
                  icon: Icons.access_time,
                  title: 'Opening Hours',
                  content:
                      '${_fmtTime(_futsalData!.openTime)} - ${_fmtTime(_futsalData!.closeTime)}',
                ),

                SizedBox(height: Dimension.height(24)),

                // Booking Slots
                if (_futsalData!.bookedTimeSlots.isNotEmpty) ...[
                  Text(
                    'Booked Time Slots (Today)',
                    style: TextStyle(
                      fontSize: Dimension.font(16),
                      fontWeight: FontWeight.w600,
                      color: Theme.of(context).colorScheme.onPrimary,
                    ),
                  ),
                  SizedBox(height: Dimension.height(12)),
                  Container(
                    padding: EdgeInsets.all(Dimension.width(12)),
                    decoration: BoxDecoration(
                      color: Theme.of(context).cardColor,
                      borderRadius: BorderRadius.circular(Dimension.width(12)),
                      border: Border.all(
                        color: Theme.of(
                          context,
                        ).colorScheme.onPrimary.withValues(alpha: 0.1),
                      ),
                    ),
                    child: Wrap(
                      spacing: Dimension.width(8),
                      runSpacing: Dimension.height(8),
                      children: _futsalData!.bookedTimeSlots
                          .where((slot) {
                            final isTodaySlot =
                                slot.bookingDate.year == DateTime.now().year &&
                                slot.bookingDate.month ==
                                    DateTime.now().month &&
                                slot.bookingDate.day == DateTime.now().day;
                            return isTodaySlot;
                          })
                          .map((slot) {
                            return Container(
                              padding: EdgeInsets.symmetric(
                                horizontal: Dimension.width(12),
                                vertical: Dimension.height(8),
                              ),
                              decoration: BoxDecoration(
                                color: Colors.red.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(
                                  Dimension.width(8),
                                ),
                                border: Border.all(
                                  color: Colors.red.withOpacity(0.3),
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    Icons.access_time,
                                    size: Dimension.width(14),
                                    color: Colors.red,
                                  ),
                                  SizedBox(width: Dimension.width(4)),
                                  Text(
                                    '${_fmtTime(slot.startTime)} - ${_fmtTime(slot.endTime)}',
                                    style: TextStyle(
                                      fontSize: Dimension.font(12),
                                      fontWeight: FontWeight.w500,
                                      color: Colors.red,
                                    ),
                                  ),
                                ],
                              ),
                            );
                          })
                          .toList(),
                    ),
                  ),
                  SizedBox(height: Dimension.height(24)),
                ],

                // Description
                Text(
                  'Description',
                  style: TextStyle(
                    fontSize: Dimension.font(16),
                    fontWeight: FontWeight.w600,
                    color: Theme.of(context).colorScheme.onPrimary,
                  ),
                ),
                SizedBox(height: Dimension.height(8)),
                Text(
                  _futsalData!.description,
                  style: TextStyle(
                    fontSize: Dimension.font(14),
                    color: Theme.of(
                      context,
                    ).colorScheme.onPrimary.withValues(alpha: 0.7),
                    height: 1.5,
                  ),
                ),

                // Reviews Section
                if (_futsalData!.reviews != null &&
                    _futsalData!.reviews!.isNotEmpty) ...[
                  SizedBox(height: Dimension.height(32)),
                  Text(
                    'Reviews',
                    style: TextStyle(
                      fontSize: Dimension.font(16),
                      fontWeight: FontWeight.w600,
                      color: Theme.of(context).colorScheme.onPrimary,
                    ),
                  ),
                  SizedBox(height: Dimension.height(16)),
                  ..._futsalData!.reviews!
                      .map((review) => _buildReviewCard(review))
                      .toList(),
                ],

                SizedBox(height: Dimension.height(80)),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildInfoCard({
    required IconData icon,
    required String title,
    required String content,
  }) {
    return Container(
      padding: EdgeInsets.all(Dimension.width(12)),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(Dimension.width(12)),
        border: Border.all(
          color: Theme.of(context).colorScheme.onPrimary.withValues(alpha: 0.1),
        ),
      ),
      child: Row(
        children: [
          Icon(
            icon,
            size: Dimension.width(20),
            color: Theme.of(context).primaryColor,
          ),
          SizedBox(width: Dimension.width(12)),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: Dimension.font(12),
                    color: Theme.of(
                      context,
                    ).colorScheme.onPrimary.withValues(alpha: 0.6),
                  ),
                ),
                SizedBox(height: Dimension.height(4)),
                Text(
                  content,
                  style: TextStyle(
                    fontSize: Dimension.font(14),
                    fontWeight: FontWeight.w500,
                    color: Theme.of(context).colorScheme.onPrimary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReviewCard(FutsalReview review) {
    return Container(
      margin: EdgeInsets.only(bottom: Dimension.height(12)),
      padding: EdgeInsets.all(Dimension.width(12)),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(Dimension.width(12)),
        border: Border.all(
          color: Theme.of(context).colorScheme.onPrimary.withValues(alpha: 0.1),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: Dimension.width(18),
                backgroundImage: review.userImageId != null
                    ? NetworkImage(
                        '${ApiConst.baseUrl}images/${review.userImageId}',
                      )
                    : null,
                child: review.userImageId == null
                    ? Text(
                        review.userName[0].toUpperCase(),
                        style: TextStyle(fontSize: Dimension.font(14)),
                      )
                    : null,
              ),
              SizedBox(width: Dimension.width(12)),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      review.userName,
                      style: TextStyle(
                        fontSize: Dimension.font(14),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Row(
                      children: List.generate(
                        5,
                        (index) => Icon(
                          index < review.rating
                              ? Icons.star
                              : Icons.star_border,
                          size: Dimension.width(14),
                          color: Colors.amber,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                DateFormat('MMM dd').format(review.createdAt),
                style: TextStyle(
                  fontSize: Dimension.font(12),
                  color: Theme.of(
                    context,
                  ).colorScheme.onPrimary.withValues(alpha: 0.6),
                ),
              ),
            ],
          ),
          if (review.comment != null && review.comment!.isNotEmpty) ...[
            SizedBox(height: Dimension.height(8)),
            Text(
              review.comment!,
              style: TextStyle(
                fontSize: Dimension.font(13),
                color: Theme.of(
                  context,
                ).colorScheme.onPrimary.withValues(alpha: 0.7),
                height: 1.4,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
