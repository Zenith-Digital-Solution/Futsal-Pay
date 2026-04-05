"""Add token revocation columns.

Revision ID: 0003_token_revoke_cols
Revises: 0002_login_attempt_uid_nullable
Create Date: 2026-04-05 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0003_token_revoke_cols"
down_revision = "0002_login_attempt_uid_nullable"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "tokentracking",
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "tokentracking",
        sa.Column("revoke_reason", sa.String(length=255), nullable=False, server_default=""),
    )
    op.alter_column("tokentracking", "revoke_reason", server_default=None)


def downgrade() -> None:
    op.drop_column("tokentracking", "revoke_reason")
    op.drop_column("tokentracking", "revoked_at")
