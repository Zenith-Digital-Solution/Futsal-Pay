"""add_plan_intervals_and_billing_interval

Revision ID: a1b2c3d4e5f6
Revises: 357807d55b37
Create Date: 2026-03-03 09:35:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '357807d55b37'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add quarterly and yearly price fields to subscription_plans
    with op.batch_alter_table('subscription_plans', schema=None) as batch_op:
        batch_op.add_column(sa.Column('price_quarterly', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('price_yearly', sa.Float(), nullable=True))

    # Add billing_interval to owner_subscriptions
    with op.batch_alter_table('owner_subscriptions', schema=None) as batch_op:
        batch_op.add_column(sa.Column('billing_interval', sa.String(length=20), nullable=False, server_default='monthly'))


def downgrade() -> None:
    with op.batch_alter_table('owner_subscriptions', schema=None) as batch_op:
        batch_op.drop_column('billing_interval')

    with op.batch_alter_table('subscription_plans', schema=None) as batch_op:
        batch_op.drop_column('price_yearly')
        batch_op.drop_column('price_quarterly')
