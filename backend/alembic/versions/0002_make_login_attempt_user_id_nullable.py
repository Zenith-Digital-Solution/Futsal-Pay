"""Make login attempt user_id nullable.

Revision ID: 0002_make_login_attempt_user_id_nullable
Revises: 0001_init_postgres
Create Date: 2026-04-05 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0002_make_login_attempt_user_id_nullable"
down_revision = "0001_init_postgres"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "loginattempt",
        "user_id",
        existing_type=sa.Integer(),
        nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "loginattempt",
        "user_id",
        existing_type=sa.Integer(),
        nullable=False,
    )
