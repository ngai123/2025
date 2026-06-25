"""Add ProfileLanguage table for multi-select languages

Revision ID: b5cfba8d7c7d
Revises: b986f2985e7f
Create Date: 2025-11-03 17:11:48.638347

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.sql import table, column, select, literal_column # <--- ADD THESE IMPORTS

# revision identifiers, used by Alembic.
revision: str = 'b5cfba8d7c7d'
down_revision: Union[str, Sequence[str], None] = 'b986f2985e7f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ### commands manually adjusted ###

    # 1. Create the new 'profile_languages' association table
    op.create_table('profile_languages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('profile_id', sa.Integer(), nullable=False),
        sa.Column('language_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['language_id'], ['languages.id'], ),
        sa.ForeignKeyConstraint(['profile_id'], ['profile.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_profile_languages_id'), 'profile_languages', ['id'], unique=False)

    # Define table objects for data migration
    profile_table = table(
        'profile',
        column('id', sa.Integer),
        column('language_id', sa.Integer)
    )
    profile_languages_table = table(
        'profile_languages',
        column('id', sa.Integer),
        column('profile_id', sa.Integer),
        column('language_id', sa.Integer)
    )

    connection = op.get_bind()

    # 2. Data Migration: Transfer existing single language_id from 'profile' to 'profile_languages'
    #    Only for profiles that actually have a language_id set
    existing_profile_languages = connection.execute(
        select(profile_table.c.id, profile_table.c.language_id).
        where(profile_table.c.language_id.isnot(None))
    ).fetchall()

    if existing_profile_languages:
        # Prepare data for bulk insert
        insert_data = [
            {'profile_id': profile_id, 'language_id': lang_id}
            for profile_id, lang_id in existing_profile_languages
        ]
        # Perform bulk insert into the new table
        op.bulk_insert(profile_languages_table, insert_data)
        print(f"Migrated {len(insert_data)} existing single language selections to 'profile_languages'.")


    # 3. Drop the old 'language_id' column from the 'profile' table
    with op.batch_alter_table('profile', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('profile_language_id_fkey'), type_='foreignkey') # Drop FK first
        batch_op.drop_column('language_id')


    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    # ### commands manually adjusted ###

    # 1. Add the 'language_id' column back to the 'profile' table (nullable initially)
    with op.batch_alter_table('profile', schema=None) as batch_op:
        batch_op.add_column(sa.Column('language_id', sa.Integer(), autoincrement=False, nullable=True))

    # Define table objects for data migration
    profile_table = table(
        'profile',
        column('id', sa.Integer),
        column('language_id', sa.Integer)
    )
    profile_languages_table = table(
        'profile_languages',
        column('id', sa.Integer),
        column('profile_id', sa.Integer),
        column('language_id', sa.Integer)
    )

    connection = op.get_bind()

    # 2. Data Migration: Transfer one language back from 'profile_languages' to 'profile.language_id'
    #    If a profile has multiple languages, we'll pick the first one encountered.
    #    This is a simplification for downgrade; a more complex strategy might be needed for production.
    existing_multi_languages = connection.execute(
        select(profile_languages_table.c.profile_id, profile_languages_table.c.language_id)
    ).fetchall()

    # Group by profile_id and pick one
    profile_to_single_language = {}
    for profile_id, lang_id in existing_multi_languages:
        if profile_id not in profile_to_single_language: # Only take the first one
            profile_to_single_language[profile_id] = lang_id

    for profile_id, lang_id in profile_to_single_language.items():
        connection.execute(
            profile_table.update().
            where(profile_table.c.id == profile_id).
            values(language_id=lang_id)
        )

    # 3. Re-add the foreign key constraint for 'profile.language_id'
    with op.batch_alter_table('profile', schema=None) as batch_op:
        batch_op.create_foreign_key(op.f('profile_language_id_fkey'), 'languages', ['language_id'], ['id'])


    # 4. Drop the 'profile_languages' table
    op.drop_index(op.f('ix_profile_languages_id'), table_name='profile_languages')
    op.drop_table('profile_languages')

    # ### end Alembic commands ###