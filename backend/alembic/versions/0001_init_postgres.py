"""Initial PostgreSQL schema

Revision ID: 0001_init_postgres
Revises:
Create Date: 2026-04-04

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import sqlmodel

revision: str = '0001_init_postgres'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── casbin_rule ──────────────────────────────────────────────────────────
    op.create_table(
        'casbin_rule',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('ptype', sqlmodel.AutoString(length=255), nullable=False),
        sa.Column('v0', sqlmodel.AutoString(length=255), nullable=True),
        sa.Column('v1', sqlmodel.AutoString(length=255), nullable=True),
        sa.Column('v2', sqlmodel.AutoString(length=255), nullable=True),
        sa.Column('v3', sqlmodel.AutoString(length=255), nullable=True),
        sa.Column('v4', sqlmodel.AutoString(length=255), nullable=True),
        sa.Column('v5', sqlmodel.AutoString(length=255), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_casbin_rule_ptype', 'casbin_rule', ['ptype'])
    op.create_index('ix_casbin_rule_v0', 'casbin_rule', ['v0'])
    op.create_index('ix_casbin_rule_v1', 'casbin_rule', ['v1'])
    op.create_index('ix_casbin_rule_v2', 'casbin_rule', ['v2'])

    # ── role ─────────────────────────────────────────────────────────────────
    op.create_table(
        'role',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sqlmodel.AutoString(length=50), nullable=False),
        sa.Column('description', sqlmodel.AutoString(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_role_name', 'role', ['name'], unique=True)

    # ── subscription_plans ───────────────────────────────────────────────────
    op.create_table(
        'subscription_plans',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sqlmodel.AutoString(length=100), nullable=False),
        sa.Column('slug', sqlmodel.AutoString(length=50), nullable=False),
        sa.Column('description', sqlmodel.AutoString(length=500), nullable=True),
        sa.Column('price_monthly', sa.Float(), nullable=False),
        sa.Column('price_quarterly', sa.Float(), nullable=True),
        sa.Column('price_yearly', sa.Float(), nullable=True),
        sa.Column('max_grounds', sa.Integer(), nullable=False),
        sa.Column('max_staff', sa.Integer(), nullable=False),
        sa.Column('trial_days', sa.Integer(), nullable=False),
        sa.Column('features', sqlmodel.AutoString(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('is_public', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint('price_monthly >= 0', name='ck_plan_price_monthly_nonneg'),
        sa.CheckConstraint('max_grounds >= 0', name='ck_plan_max_grounds_nonneg'),
        sa.CheckConstraint('max_staff >= 0', name='ck_plan_max_staff_nonneg'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_subscription_plans_slug', 'subscription_plans', ['slug'], unique=True)

    # ── user ─────────────────────────────────────────────────────────────────
    op.create_table(
        'user',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('username', sqlmodel.AutoString(length=50), nullable=False),
        sa.Column('email', sqlmodel.AutoString(length=255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('is_superuser', sa.Boolean(), nullable=False),
        sa.Column('is_confirmed', sa.Boolean(), nullable=False),
        sa.Column('otp_enabled', sa.Boolean(), nullable=False),
        sa.Column('otp_verified', sa.Boolean(), nullable=False),
        sa.Column('otp_base32', sqlmodel.AutoString(length=255), nullable=False),
        sa.Column('otp_auth_url', sqlmodel.AutoString(length=255), nullable=False),
        sa.Column('hashed_password', sqlmodel.AutoString(length=255), nullable=True),
        sa.Column('social_provider', sqlmodel.AutoString(length=50), nullable=True),
        sa.Column('social_id', sqlmodel.AutoString(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_user_email', 'user', ['email'], unique=True)
    op.create_index('ix_user_username', 'user', ['username'], unique=True)
    op.create_index('ix_user_social_provider', 'user', ['social_provider'])
    op.create_index('ix_user_social_id', 'user', ['social_id'])

    # ── user_profile ─────────────────────────────────────────────────────────
    op.create_table(
        'userprofile',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('first_name', sqlmodel.AutoString(length=40), nullable=False),
        sa.Column('last_name', sqlmodel.AutoString(length=40), nullable=False),
        sa.Column('phone', sqlmodel.AutoString(length=20), nullable=False),
        sa.Column('image_url', sqlmodel.AutoString(length=255), nullable=False),
        sa.Column('bio', sqlmodel.AutoString(length=500), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # ── login_attempt ────────────────────────────────────────────────────────
    op.create_table(
        'loginattempt',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('ip_address', sqlmodel.AutoString(length=45), nullable=False),
        sa.Column('user_agent', sqlmodel.AutoString(length=255), nullable=False),
        sa.Column('success', sa.Boolean(), nullable=False),
        sa.Column('failure_reason', sqlmodel.AutoString(length=255), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_loginattempt_user_id', 'loginattempt', ['user_id'])
    op.create_index('ix_loginattempt_ip_address', 'loginattempt', ['ip_address'])

    # ── token_tracking ───────────────────────────────────────────────────────
    op.create_table(
        'tokentracking',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('token_jti', sqlmodel.AutoString(length=255), nullable=False),
        sa.Column('token_type', sqlmodel.AutoString(length=50), nullable=False),
        sa.Column('ip_address', sqlmodel.AutoString(length=45), nullable=True),
        sa.Column('user_agent', sqlmodel.AutoString(length=255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_tokentracking_user_id', 'tokentracking', ['user_id'])
    op.create_index('ix_tokentracking_token_jti', 'tokentracking', ['token_jti'], unique=True)

    # ── used_token ───────────────────────────────────────────────────────────
    op.create_table(
        'usedtoken',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('jti', sqlmodel.AutoString(length=255), nullable=False),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_usedtoken_jti', 'usedtoken', ['jti'], unique=True)

    # ── user_role ────────────────────────────────────────────────────────────
    op.create_table(
        'userrole',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('role_id', sa.Integer(), nullable=False),
        sa.Column('assigned_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['role_id'], ['role.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'role_id', name='uq_user_role'),
    )

    # ── general_settings ─────────────────────────────────────────────────────
    op.create_table(
        'generalsettings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('key', sqlmodel.AutoString(length=100), nullable=False),
        sa.Column('value', sqlmodel.AutoString(length=1000), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('key', name='uq_generalsettings_key'),
    )

    # ── tenant ───────────────────────────────────────────────────────────────
    op.create_table(
        'tenant',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sqlmodel.AutoString(length=100), nullable=False),
        sa.Column('slug', sqlmodel.AutoString(length=100), nullable=False),
        sa.Column('owner_id', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['owner_id'], ['user.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug', name='uq_tenant_slug'),
    )

    # ── tenant_member ─────────────────────────────────────────────────────────
    op.create_table(
        'tenantmember',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('role', sqlmodel.AutoString(length=50), nullable=False),
        sa.Column('joined_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenant.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('tenant_id', 'user_id', name='uq_tenant_member'),
    )

    # ── tenant_invitation ────────────────────────────────────────────────────
    op.create_table(
        'tenantinvitation',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('email', sqlmodel.AutoString(length=255), nullable=False),
        sa.Column('role', sqlmodel.AutoString(length=50), nullable=False),
        sa.Column('token', sqlmodel.AutoString(length=255), nullable=False),
        sa.Column('invited_by', sa.Integer(), nullable=False),
        sa.Column('accepted', sa.Boolean(), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenant.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['invited_by'], ['user.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token', name='uq_invitation_token'),
    )

    # ── notification ─────────────────────────────────────────────────────────
    op.create_table(
        'notification',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('title', sqlmodel.AutoString(length=200), nullable=False),
        sa.Column('body', sqlmodel.AutoString(length=1000), nullable=False),
        sa.Column('type', sqlmodel.AutoString(length=50), nullable=False),
        sa.Column('is_read', sa.Boolean(), nullable=False),
        sa.Column('extra_data', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_notification_user_id', 'notification', ['user_id'])
    op.create_index('ix_notification_is_read', 'notification', ['is_read'])

    # ── notification_preference ───────────────────────────────────────────────
    op.create_table(
        'notificationpreference',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('email_enabled', sa.Boolean(), nullable=False),
        sa.Column('push_enabled', sa.Boolean(), nullable=False),
        sa.Column('sms_enabled', sa.Boolean(), nullable=False),
        sa.Column('booking_reminders', sa.Boolean(), nullable=False),
        sa.Column('promotional', sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', name='uq_notif_pref_user'),
    )

    # ── fcm_device_token ─────────────────────────────────────────────────────
    op.create_table(
        'fcmdevicetoken',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('fcm_token', sqlmodel.AutoString(length=512), nullable=False),
        sa.Column('device_type', sqlmodel.AutoString(length=50), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('fcm_token', name='uq_fcm_token'),
    )

    # ── payment_transactions ─────────────────────────────────────────────────
    op.create_table(
        'payment_transactions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('provider', sqlmodel.AutoString(length=50), nullable=False),
        sa.Column('amount', sa.Integer(), nullable=False),
        sa.Column('currency', sqlmodel.AutoString(length=3), nullable=False),
        sa.Column('status', sqlmodel.AutoString(length=50), nullable=False),
        sa.Column('purchase_order_id', sqlmodel.AutoString(length=255), nullable=False),
        sa.Column('purchase_order_name', sqlmodel.AutoString(length=255), nullable=False),
        sa.Column('provider_transaction_id', sqlmodel.AutoString(length=255), nullable=True),
        sa.Column('provider_pidx', sqlmodel.AutoString(length=255), nullable=True),
        sa.Column('return_url', sqlmodel.AutoString(length=500), nullable=False),
        sa.Column('website_url', sqlmodel.AutoString(length=500), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('extra_data', sa.Text(), nullable=True),
        sa.Column('failure_reason', sqlmodel.AutoString(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint('amount > 0', name='ck_payment_amount_positive'),
        sa.ForeignKeyConstraint(['user_id'], ['user.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_payment_purchase_order_id', 'payment_transactions', ['purchase_order_id'])
    op.create_index('ix_payment_provider_transaction_id', 'payment_transactions', ['provider_transaction_id'])
    op.create_index('ix_payment_provider_pidx', 'payment_transactions', ['provider_pidx'])

    # ── payment_webhooks ─────────────────────────────────────────────────────
    op.create_table(
        'payment_webhooks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('provider', sqlmodel.AutoString(length=50), nullable=False),
        sa.Column('event_type', sqlmodel.AutoString(length=100), nullable=False),
        sa.Column('transaction_id', sa.Integer(), nullable=True),
        sa.Column('raw_payload', sa.Text(), nullable=False),
        sa.Column('is_verified', sa.Boolean(), nullable=False),
        sa.Column('ip_address', sqlmodel.AutoString(length=45), nullable=True),
        sa.Column('received_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['transaction_id'], ['payment_transactions.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # ── futsal_grounds ───────────────────────────────────────────────────────
    op.create_table(
        'futsal_grounds',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sqlmodel.AutoString(length=100), nullable=False),
        sa.Column('slug', sqlmodel.AutoString(length=120), nullable=False),
        sa.Column('owner_id', sa.Integer(), nullable=False),
        sa.Column('location', sqlmodel.AutoString(length=255), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('description', sqlmodel.AutoString(length=1000), nullable=True),
        sa.Column('ground_type', sqlmodel.AutoString(length=50), nullable=False),
        sa.Column('price_per_hour', sa.Float(), nullable=False),
        sa.Column('weekend_price_per_hour', sa.Float(), nullable=True),
        sa.Column('peak_hours_start', sa.Time(), nullable=True),
        sa.Column('peak_hours_end', sa.Time(), nullable=True),
        sa.Column('peak_price_multiplier', sa.Float(), nullable=False),
        sa.Column('open_time', sa.Time(), nullable=False),
        sa.Column('close_time', sa.Time(), nullable=False),
        sa.Column('slot_duration_minutes', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('disabled_by_limit', sa.Boolean(), nullable=False),
        sa.Column('is_verified', sa.Boolean(), nullable=False),
        sa.Column('average_rating', sa.Float(), nullable=False),
        sa.Column('rating_count', sa.Integer(), nullable=False),
        sa.Column('amenities', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint('price_per_hour > 0', name='ck_ground_price_positive'),
        sa.CheckConstraint('weekend_price_per_hour IS NULL OR weekend_price_per_hour > 0', name='ck_ground_weekend_price_positive'),
        sa.CheckConstraint('peak_price_multiplier >= 1.0 AND peak_price_multiplier <= 3.0', name='ck_ground_peak_multiplier_range'),
        sa.CheckConstraint('average_rating >= 0.0 AND average_rating <= 5.0', name='ck_ground_rating_range'),
        sa.CheckConstraint('rating_count >= 0', name='ck_ground_rating_count_nonneg'),
        sa.CheckConstraint('slot_duration_minutes >= 30 AND slot_duration_minutes <= 180', name='ck_ground_slot_duration_range'),
        sa.CheckConstraint('latitude IS NULL OR (latitude >= -90 AND latitude <= 90)', name='ck_ground_lat_range'),
        sa.CheckConstraint('longitude IS NULL OR (longitude >= -180 AND longitude <= 180)', name='ck_ground_lon_range'),
        sa.ForeignKeyConstraint(['owner_id'], ['user.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_futsal_grounds_slug', 'futsal_grounds', ['slug'], unique=True)
    op.create_index('ix_futsal_grounds_owner_id', 'futsal_grounds', ['owner_id'])
    op.create_index('ix_ground_owner_active', 'futsal_grounds', ['owner_id', 'is_active'])

    # ── ground_images ─────────────────────────────────────────────────────────
    op.create_table(
        'ground_images',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('ground_id', sa.Integer(), nullable=False),
        sa.Column('image_url', sqlmodel.AutoString(length=500), nullable=False),
        sa.Column('is_primary', sa.Boolean(), nullable=False),
        sa.Column('display_order', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['ground_id'], ['futsal_grounds.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # ── bookings ─────────────────────────────────────────────────────────────
    op.create_table(
        'bookings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('ground_id', sa.Integer(), nullable=False),
        sa.Column('booking_date', sa.Date(), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=False),
        sa.Column('total_amount', sa.Float(), nullable=False),
        sa.Column('paid_amount', sa.Float(), nullable=False),
        sa.Column('is_recurring', sa.Boolean(), nullable=False),
        sa.Column('recurring_type', sqlmodel.AutoString(length=50), nullable=True),
        sa.Column('recurring_end_date', sa.Date(), nullable=True),
        sa.Column('team_name', sqlmodel.AutoString(length=100), nullable=True),
        sa.Column('notes', sqlmodel.AutoString(length=500), nullable=True),
        sa.Column('cancellation_reason', sqlmodel.AutoString(length=300), nullable=True),
        sa.Column('status', sqlmodel.AutoString(length=50), nullable=False),
        sa.Column('qr_code', sqlmodel.AutoString(length=255), nullable=False),
        sa.Column('qr_used', sa.Boolean(), nullable=False),
        sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('pre_play_reminder_sent', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint('total_amount >= 0', name='ck_booking_total_amount_nonneg'),
        sa.CheckConstraint('paid_amount >= 0', name='ck_booking_paid_amount_nonneg'),
        sa.CheckConstraint('paid_amount <= total_amount', name='ck_booking_paid_lte_total'),
        sa.CheckConstraint('end_time > start_time', name='ck_booking_end_after_start'),
        sa.ForeignKeyConstraint(['user_id'], ['user.id']),
        sa.ForeignKeyConstraint(['ground_id'], ['futsal_grounds.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('qr_code', name='uq_booking_qr_code'),
    )
    op.create_index('ix_bookings_user_id', 'bookings', ['user_id'])
    op.create_index('ix_bookings_ground_id', 'bookings', ['ground_id'])
    op.create_index('ix_bookings_booking_date', 'bookings', ['booking_date'])
    op.create_index('ix_bookings_qr_code', 'bookings', ['qr_code'])
    op.create_index('ix_booking_ground_date_status', 'bookings', ['ground_id', 'booking_date', 'status'])
    op.create_index('ix_booking_user_date', 'bookings', ['user_id', 'booking_date'])

    # ── booking_locks ────────────────────────────────────────────────────────
    op.create_table(
        'booking_locks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('ground_id', sa.Integer(), nullable=False),
        sa.Column('booking_date', sa.Date(), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=False),
        sa.Column('locked_by_booking_id', sa.Integer(), nullable=True),
        sa.Column('locked_by_user_id', sa.Integer(), nullable=False),
        sa.Column('locked_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['ground_id'], ['futsal_grounds.id']),
        sa.ForeignKeyConstraint(['locked_by_booking_id'], ['bookings.id']),
        sa.ForeignKeyConstraint(['locked_by_user_id'], ['user.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_booking_lock_ground_date', 'booking_locks', ['ground_id', 'booking_date'])

    # ── reviews ───────────────────────────────────────────────────────────────
    op.create_table(
        'reviews',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('ground_id', sa.Integer(), nullable=False),
        sa.Column('booking_id', sa.Integer(), nullable=False),
        sa.Column('rating', sa.Integer(), nullable=False),
        sa.Column('comment', sqlmodel.AutoString(length=1000), nullable=True),
        sa.Column('image_url', sqlmodel.AutoString(length=500), nullable=True),
        sa.Column('owner_reply', sqlmodel.AutoString(length=1000), nullable=True),
        sa.Column('owner_replied_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_verified', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint('rating >= 1 AND rating <= 5', name='ck_review_rating_range'),
        sa.ForeignKeyConstraint(['user_id'], ['user.id']),
        sa.ForeignKeyConstraint(['ground_id'], ['futsal_grounds.id']),
        sa.ForeignKeyConstraint(['booking_id'], ['bookings.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('booking_id', name='uq_review_booking_id'),
        sa.UniqueConstraint('user_id', 'ground_id', 'booking_id', name='uq_review_booking'),
    )
    op.create_index('ix_reviews_user_id', 'reviews', ['user_id'])
    op.create_index('ix_reviews_ground_id', 'reviews', ['ground_id'])

    # ── ground_closures ───────────────────────────────────────────────────────
    op.create_table(
        'ground_closures',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('ground_id', sa.Integer(), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('reason', sqlmodel.AutoString(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint('end_date >= start_date', name='ck_closure_end_gte_start'),
        sa.ForeignKeyConstraint(['ground_id'], ['futsal_grounds.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_ground_closures_ground_id', 'ground_closures', ['ground_id'])

    # ── favourite_grounds ─────────────────────────────────────────────────────
    op.create_table(
        'favourite_grounds',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('ground_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['ground_id'], ['futsal_grounds.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'ground_id', name='uq_favourite'),
    )

    # ── waitlist_entries ──────────────────────────────────────────────────────
    op.create_table(
        'waitlist_entries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('ground_id', sa.Integer(), nullable=False),
        sa.Column('booking_date', sa.Date(), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('notified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['ground_id'], ['futsal_grounds.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # ── payout_ledger ─────────────────────────────────────────────────────────
    op.create_table(
        'payout_ledger',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('ground_id', sa.Integer(), nullable=False),
        sa.Column('owner_id', sa.Integer(), nullable=False),
        sa.Column('booking_id', sa.Integer(), nullable=False),
        sa.Column('gross_amount', sa.Float(), nullable=False),
        sa.Column('platform_fee_pct', sa.Float(), nullable=False),
        sa.Column('platform_fee', sa.Float(), nullable=False),
        sa.Column('net_amount', sa.Float(), nullable=False),
        sa.Column('settled', sa.Boolean(), nullable=False),
        sa.Column('settled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('payout_record_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint('gross_amount >= 0', name='ck_ledger_gross_nonneg'),
        sa.CheckConstraint('net_amount >= 0', name='ck_ledger_net_nonneg'),
        sa.CheckConstraint('platform_fee >= 0', name='ck_ledger_fee_nonneg'),
        sa.ForeignKeyConstraint(['ground_id'], ['futsal_grounds.id']),
        sa.ForeignKeyConstraint(['owner_id'], ['user.id']),
        sa.ForeignKeyConstraint(['booking_id'], ['bookings.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('booking_id', name='uq_ledger_booking'),
    )

    # ── payout_records ────────────────────────────────────────────────────────
    op.create_table(
        'payout_records',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('owner_id', sa.Integer(), nullable=False),
        sa.Column('period_start', sa.Date(), nullable=False),
        sa.Column('period_end', sa.Date(), nullable=False),
        sa.Column('total_bookings', sa.Integer(), nullable=False),
        sa.Column('gross_amount', sa.Float(), nullable=False),
        sa.Column('platform_fee', sa.Float(), nullable=False),
        sa.Column('net_amount', sa.Float(), nullable=False),
        sa.Column('currency', sqlmodel.AutoString(length=3), nullable=False),
        sa.Column('status', sqlmodel.AutoString(length=50), nullable=False),
        sa.Column('transaction_ref', sqlmodel.AutoString(length=255), nullable=True),
        sa.Column('retry_count', sa.Integer(), nullable=False),
        sa.Column('last_error', sqlmodel.AutoString(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['owner_id'], ['user.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # ── owner_gateways ────────────────────────────────────────────────────────
    op.create_table(
        'owner_gateways',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('owner_id', sa.Integer(), nullable=False),
        sa.Column('provider', sqlmodel.AutoString(length=50), nullable=False),
        sa.Column('account_name', sqlmodel.AutoString(length=255), nullable=False),
        sa.Column('encrypted_credentials', sa.Text(), nullable=False),
        sa.Column('is_verified', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['owner_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('owner_id', 'provider', name='uq_owner_gateway_provider'),
    )

    # ── owner_subscriptions ───────────────────────────────────────────────────
    op.create_table(
        'owner_subscriptions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('owner_id', sa.Integer(), nullable=False),
        sa.Column('plan_id', sa.Integer(), nullable=False),
        sa.Column('billing_cycle', sqlmodel.AutoString(length=20), nullable=False),
        sa.Column('status', sqlmodel.AutoString(length=50), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('trial_ends_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('payment_ref', sqlmodel.AutoString(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['owner_id'], ['user.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['plan_id'], ['subscription_plans.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('owner_id', name='uq_owner_subscription'),
    )

    # ── ground_staff ──────────────────────────────────────────────────────────
    op.create_table(
        'ground_staff',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('ground_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('role', sqlmodel.AutoString(length=50), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['ground_id'], ['futsal_grounds.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('ground_id', 'user_id', name='uq_ground_staff'),
    )


def downgrade() -> None:
    op.drop_table('ground_staff')
    op.drop_table('owner_subscriptions')
    op.drop_table('owner_gateways')
    op.drop_table('payout_records')
    op.drop_table('payout_ledger')
    op.drop_table('waitlist_entries')
    op.drop_table('favourite_grounds')
    op.drop_table('ground_closures')
    op.drop_table('reviews')
    op.drop_table('booking_locks')
    op.drop_table('bookings')
    op.drop_table('ground_images')
    op.drop_table('futsal_grounds')
    op.drop_table('payment_webhooks')
    op.drop_table('payment_transactions')
    op.drop_table('fcmdevicetoken')
    op.drop_table('notificationpreference')
    op.drop_table('notification')
    op.drop_table('tenantinvitation')
    op.drop_table('tenantmember')
    op.drop_table('tenant')
    op.drop_table('generalsettings')
    op.drop_table('userrole')
    op.drop_table('usedtoken')
    op.drop_table('tokentracking')
    op.drop_table('loginattempt')
    op.drop_table('userprofile')
    op.drop_table('user')
    op.drop_table('subscription_plans')
    op.drop_table('role')
    op.drop_table('casbin_rule')
