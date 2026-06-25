"""add user_blocks table

Revision ID: add_user_blocks_20251117
Revises: b5cfba8d7c7d
Create Date: 2025-11-17
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_user_blocks_20251117'
down_revision = 'b5cfba8d7c7d'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'user_blocks',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('blocker_id', sa.BigInteger(), nullable=False),
        sa.Column('blocked_id', sa.BigInteger(), nullable=False),
        sa.Column('timestamp', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()')),
        sa.ForeignKeyConstraint(['blocker_id'], ['users.id']),
        sa.ForeignKeyConstraint(['blocked_id'], ['users.id']),
    )
    op.create_index('idx_blocker_id', 'user_blocks', ['blocker_id'])
    op.create_index('idx_blocked_id', 'user_blocks', ['blocked_id'])
    op.create_unique_constraint('uq_blocker_blocked', 'user_blocks', ['blocker_id', 'blocked_id'])


def downgrade() -> None:
    op.drop_constraint('uq_blocker_blocked', 'user_blocks', type_='unique')
    op.drop_index('idx_blocker_id', table_name='user_blocks')
    op.drop_index('idx_blocked_id', table_name='user_blocks')
    op.drop_table('user_blocks')