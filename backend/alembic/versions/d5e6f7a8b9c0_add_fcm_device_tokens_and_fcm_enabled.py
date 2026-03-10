"""add_fcm_device_tokens

Revision ID: d5e6f7a8b9c0
Revises: c3d4e5f6a7b8
Create Date: 2026-03-09 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d5e6f7a8b9c0"
down_revision: Union[str, None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create fcmdevicetoken table
    op.create_table(
        "fcmdevicetoken",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("fcm_token", sa.String(length=512), nullable=False),
        sa.Column("device_type", sa.String(length=20), nullable=False, server_default="web"),
        sa.Column("device_name", sa.String(length=100), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("fcm_token"),
    )
    op.create_index(op.f("ix_fcmdevicetoken_user_id"), "fcmdevicetoken", ["user_id"])
    op.create_index(op.f("ix_fcmdevicetoken_fcm_token"), "fcmdevicetoken", ["fcm_token"])


def downgrade() -> None:
    op.drop_index(op.f("ix_fcmdevicetoken_fcm_token"), table_name="fcmdevicetoken")
    op.drop_index(op.f("ix_fcmdevicetoken_user_id"), table_name="fcmdevicetoken")
    op.drop_table("fcmdevicetoken")
