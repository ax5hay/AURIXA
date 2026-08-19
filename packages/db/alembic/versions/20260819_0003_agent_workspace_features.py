"""agent workspace features — notes, escalations, contact tracking

Revision ID: 20260819_0003
Revises: 20260811_0002
Create Date: 2026-08-19
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision: str = "20260819_0003"
down_revision: Union[str, None] = "20260811_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(name: str) -> bool:
    bind = op.get_bind()
    return inspect(bind).has_table(name)


def _has_column(table: str, column: str) -> bool:
    bind = op.get_bind()
    if not _has_table(table):
        return False
    return column in {col["name"] for col in inspect(bind).get_columns(table)}


def upgrade() -> None:
    if _has_table("clients") and not _has_column("clients", "notes"):
        op.add_column("clients", sa.Column("notes", sa.Text(), nullable=True))
    if _has_table("clients") and not _has_column("clients", "last_contact_at"):
        op.add_column("clients", sa.Column("last_contact_at", sa.DateTime(), nullable=True))

    if _has_table("leads") and not _has_column("leads", "last_contacted_at"):
        op.add_column("leads", sa.Column("last_contacted_at", sa.DateTime(), nullable=True))

    if _has_table("showings") and not _has_column("showings", "post_showing_notes"):
        op.add_column("showings", sa.Column("post_showing_notes", sa.Text(), nullable=True))

    if not _has_table("safety_escalations"):
        op.create_table(
            "safety_escalations",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "created_at",
                sa.DateTime(),
                server_default=sa.text("TIMEZONE('utc', now())"),
                nullable=False,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(),
                server_default=sa.text("TIMEZONE('utc', now())"),
                nullable=False,
            ),
            sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id"), nullable=True),
            sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=True),
            sa.Column("conversation_id", sa.Integer(), sa.ForeignKey("conversations.id"), nullable=True),
            sa.Column("session_id", sa.String(), nullable=True),
            sa.Column("channel", sa.String(), server_default="client", nullable=False),
            sa.Column("source_text", sa.Text(), nullable=False),
            sa.Column("escalation_type", sa.String(), nullable=True),
            sa.Column("status", sa.String(), server_default="pending", nullable=False),
            sa.Column("reviewed_by", sa.String(), nullable=True),
            sa.Column("reviewed_at", sa.DateTime(), nullable=True),
        )
        op.create_index("ix_safety_escalations_tenant_id", "safety_escalations", ["tenant_id"])
        op.create_index("ix_safety_escalations_client_id", "safety_escalations", ["client_id"])
        op.create_index("ix_safety_escalations_status", "safety_escalations", ["status"])


def downgrade() -> None:
    if _has_table("safety_escalations"):
        op.drop_table("safety_escalations")
    if _has_column("showings", "post_showing_notes"):
        op.drop_column("showings", "post_showing_notes")
    if _has_column("leads", "last_contacted_at"):
        op.drop_column("leads", "last_contacted_at")
    if _has_column("clients", "last_contact_at"):
        op.drop_column("clients", "last_contact_at")
    if _has_column("clients", "notes"):
        op.drop_column("clients", "notes")
