"""real estate domain schema

Revision ID: 20260811_0002
Revises: 20260808_0001
Create Date: 2026-08-11

Replaces healthcare domain tables (patients, appointments, etc.) with the real
estate schema. Greenfield pivot — existing healthcare demo data is dropped.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision: str = "20260811_0002"
down_revision: Union[str, None] = "20260808_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _base_columns() -> list[sa.Column]:
    return [
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
    ]


def _has_table(name: str) -> bool:
    bind = op.get_bind()
    return inspect(bind).has_table(name)


def _has_column(table: str, column: str) -> bool:
    bind = op.get_bind()
    if not _has_table(table):
        return False
    return column in {col["name"] for col in inspect(bind).get_columns(table)}


def upgrade() -> None:
    # Remove healthcare domain tables (order respects FK dependencies).
    for table in ("prescriptions", "patient_insurance", "appointments", "patients"):
        op.execute(sa.text(f"DROP TABLE IF EXISTS {table} CASCADE"))

    op.execute(sa.text("DROP TABLE IF EXISTS showings CASCADE"))
    op.execute(sa.text("DROP TABLE IF EXISTS availability_slots CASCADE"))
    op.execute(sa.text("DROP TABLE IF EXISTS service_requests CASCADE"))
    op.execute(sa.text("DROP TABLE IF EXISTS client_financing CASCADE"))
    op.execute(sa.text("DROP TABLE IF EXISTS documents CASCADE"))
    op.execute(sa.text("DROP TABLE IF EXISTS deals CASCADE"))
    op.execute(sa.text("DROP TABLE IF EXISTS offers CASCADE"))
    op.execute(sa.text("DROP TABLE IF EXISTS applications CASCADE"))
    op.execute(sa.text("DROP TABLE IF EXISTS leads CASCADE"))
    op.execute(sa.text("DROP TABLE IF EXISTS pipeline_stages CASCADE"))
    op.execute(sa.text("DROP TABLE IF EXISTS listing_media CASCADE"))
    op.execute(sa.text("DROP TABLE IF EXISTS listings CASCADE"))
    op.execute(sa.text("DROP TABLE IF EXISTS properties CASCADE"))
    op.execute(sa.text("DROP TABLE IF EXISTS clients CASCADE"))

    if not _has_table("tenants"):
        op.create_table(
            "tenants",
            *_base_columns(),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("domain", sa.String(), nullable=True),
            sa.Column("org_type", sa.String(), server_default="brokerage", nullable=False),
            sa.Column("plan", sa.String(), server_default="starter", nullable=False),
            sa.Column("status", sa.String(), server_default="active", nullable=False),
            sa.Column("api_key_count", sa.Integer(), server_default="0", nullable=False),
            sa.UniqueConstraint("name"),
            sa.UniqueConstraint("domain"),
        )
    elif not _has_column("tenants", "org_type"):
        op.add_column(
            "tenants",
            sa.Column("org_type", sa.String(), server_default="brokerage", nullable=False),
        )

    if not _has_table("users"):
        op.create_table(
            "users",
            *_base_columns(),
            sa.Column("email", sa.String(), nullable=False),
            sa.Column("hashed_password", sa.String(), nullable=False),
            sa.Column("full_name", sa.String(), nullable=True),
            sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
            sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id"), nullable=False),
            sa.UniqueConstraint("email"),
        )
        op.create_index("ix_users_email", "users", ["email"])

    if not _has_table("staff"):
        op.create_table(
            "staff",
            *_base_columns(),
            sa.Column("full_name", sa.String(), nullable=False),
            sa.Column("email", sa.String(), nullable=True),
            sa.Column("role", sa.String(), server_default="agent", nullable=False),
            sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id"), nullable=False),
            sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        )

    if not _has_table("audit_logs"):
        op.create_table(
            "audit_logs",
            *_base_columns(),
            sa.Column("service", sa.String(), nullable=False),
            sa.Column("action", sa.String(), nullable=False),
            sa.Column("user", sa.String(), nullable=False),
            sa.Column("details", sa.Text(), nullable=False),
            sa.Column("severity", sa.String(), server_default="info", nullable=False),
        )
        op.create_index("ix_audit_logs_service", "audit_logs", ["service"])

    if not _has_table("conversations"):
        op.create_table(
            "conversations",
            *_base_columns(),
            sa.Column("session_id", sa.String(), nullable=False),
            sa.Column("meta_data", sa.JSON(), nullable=True),
            sa.UniqueConstraint("session_id"),
        )
        op.create_index("ix_conversations_session_id", "conversations", ["session_id"])

    if not _has_table("pipeline_steps"):
        op.create_table(
            "pipeline_steps",
            *_base_columns(),
            sa.Column("conversation_id", sa.Integer(), sa.ForeignKey("conversations.id"), nullable=False),
            sa.Column("step_name", sa.String(), nullable=False),
            sa.Column("status", sa.String(), nullable=False),
            sa.Column("input", sa.JSON(), nullable=True),
            sa.Column("output", sa.JSON(), nullable=True),
            sa.Column("error_message", sa.Text(), nullable=True),
            sa.Column("start_time", sa.Float(), nullable=True),
            sa.Column("end_time", sa.Float(), nullable=True),
        )

    op.create_table(
        "clients",
        *_base_columns(),
        sa.Column("full_name", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=True),
        sa.Column("phone_number", sa.String(), nullable=True),
        sa.Column("client_type", sa.String(), server_default="buyer", nullable=False),
        sa.Column("preferences", sa.JSON(), nullable=True),
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id"), nullable=True),
    )

    op.create_table(
        "properties",
        *_base_columns(),
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("address_line1", sa.String(), nullable=False),
        sa.Column("address_line2", sa.String(), nullable=True),
        sa.Column("city", sa.String(), nullable=False),
        sa.Column("state", sa.String(), nullable=False),
        sa.Column("postal_code", sa.String(), nullable=False),
        sa.Column("country", sa.String(), server_default="US", nullable=False),
        sa.Column("property_type", sa.String(), server_default="single_family", nullable=False),
        sa.Column("beds", sa.Integer(), nullable=True),
        sa.Column("baths", sa.Float(), nullable=True),
        sa.Column("sqft", sa.Integer(), nullable=True),
        sa.Column("year_built", sa.Integer(), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
    )

    op.create_table(
        "listings",
        *_base_columns(),
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("property_id", sa.Integer(), sa.ForeignKey("properties.id"), nullable=False),
        sa.Column("listing_type", sa.String(), server_default="sale", nullable=False),
        sa.Column("status", sa.String(), server_default="draft", nullable=False),
        sa.Column("list_price", sa.Integer(), nullable=True),
        sa.Column("rent_amount", sa.Integer(), nullable=True),
        sa.Column("marketing_title", sa.String(), nullable=True),
        sa.Column("marketing_description", sa.Text(), nullable=True),
        sa.Column("external_id", sa.String(), nullable=True),
        sa.Column("external_source", sa.String(), nullable=True),
        sa.Column("published_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "listing_media",
        *_base_columns(),
        sa.Column("listing_id", sa.Integer(), sa.ForeignKey("listings.id"), nullable=False),
        sa.Column("media_type", sa.String(), server_default="photo", nullable=False),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("caption", sa.String(), nullable=True),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
    )

    op.create_table(
        "pipeline_stages",
        *_base_columns(),
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("segment", sa.String(), nullable=False),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("display_name", sa.String(), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("is_terminal", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.UniqueConstraint("tenant_id", "segment", "slug", name="uq_pipeline_stage_tenant_segment_slug"),
    )

    op.create_table(
        "leads",
        *_base_columns(),
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=True),
        sa.Column("listing_id", sa.Integer(), sa.ForeignKey("listings.id"), nullable=True),
        sa.Column("assigned_staff_id", sa.Integer(), sa.ForeignKey("staff.id"), nullable=True),
        sa.Column("full_name", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=True),
        sa.Column("phone_number", sa.String(), nullable=True),
        sa.Column("source", sa.String(), server_default="website", nullable=False),
        sa.Column("stage", sa.String(), server_default="new", nullable=False),
        sa.Column("segment", sa.String(), server_default="residential", nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
    )

    op.create_table(
        "showings",
        *_base_columns(),
        sa.Column("start_time", sa.DateTime(), nullable=False),
        sa.Column("end_time", sa.DateTime(), nullable=False),
        sa.Column("agent_name", sa.String(), nullable=False),
        sa.Column("staff_id", sa.Integer(), sa.ForeignKey("staff.id"), nullable=True),
        sa.Column("notes", sa.String(), nullable=True),
        sa.Column("showing_type", sa.String(), server_default="private_tour", nullable=False),
        sa.Column("status", sa.String(), server_default="confirmed", nullable=False),
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("listing_id", sa.Integer(), sa.ForeignKey("listings.id"), nullable=True),
    )
    op.create_index(
        "ix_showings_client_status_start",
        "showings",
        ["client_id", "status", "start_time"],
    )

    op.create_table(
        "availability_slots",
        *_base_columns(),
        sa.Column("slot_date", sa.Date(), nullable=False),
        sa.Column("start_time", sa.String(), nullable=False),
        sa.Column("end_time", sa.String(), nullable=False),
        sa.Column("agent_name", sa.String(), nullable=False),
        sa.Column("staff_id", sa.Integer(), sa.ForeignKey("staff.id"), nullable=True),
        sa.Column("listing_id", sa.Integer(), sa.ForeignKey("listings.id"), nullable=True),
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id"), nullable=False),
    )

    op.create_table(
        "client_financing",
        *_base_columns(),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("program_name", sa.String(), nullable=False),
        sa.Column("lender", sa.String(), nullable=True),
        sa.Column("reference_id", sa.String(), nullable=True),
        sa.Column("deposit_amount", sa.String(), nullable=True),
        sa.Column("approved_amount", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(), server_default="pending", nullable=False),
    )

    op.create_table(
        "service_requests",
        *_base_columns(),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("category", sa.String(), server_default="maintenance", nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(), server_default="open", nullable=False),
        sa.Column("requested_at", sa.DateTime(), nullable=True),
        sa.Column("listing_id", sa.Integer(), sa.ForeignKey("listings.id"), nullable=True),
    )

    op.create_table(
        "applications",
        *_base_columns(),
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("listing_id", sa.Integer(), sa.ForeignKey("listings.id"), nullable=False),
        sa.Column("application_type", sa.String(), server_default="rental", nullable=False),
        sa.Column("status", sa.String(), server_default="draft", nullable=False),
        sa.Column("submitted_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "offers",
        *_base_columns(),
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("listing_id", sa.Integer(), sa.ForeignKey("listings.id"), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(), server_default="draft", nullable=False),
        sa.Column("contingencies", sa.JSON(), nullable=True),
        sa.Column("submitted_at", sa.DateTime(), nullable=True),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "deals",
        *_base_columns(),
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("listing_id", sa.Integer(), sa.ForeignKey("listings.id"), nullable=False),
        sa.Column("offer_id", sa.Integer(), sa.ForeignKey("offers.id"), nullable=True),
        sa.Column("status", sa.String(), server_default="under_contract", nullable=False),
        sa.Column("milestone", sa.String(), nullable=True),
        sa.Column("closed_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "documents",
        *_base_columns(),
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("listing_id", sa.Integer(), sa.ForeignKey("listings.id"), nullable=True),
        sa.Column("deal_id", sa.Integer(), sa.ForeignKey("deals.id"), nullable=True),
        sa.Column("document_type", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("storage_uri", sa.Text(), nullable=True),
        sa.Column("status", sa.String(), server_default="pending", nullable=False),
    )

    if not _has_table("knowledge_base_articles"):
        op.create_table(
            "knowledge_base_articles",
            *_base_columns(),
            sa.Column("title", sa.String(), nullable=False),
            sa.Column("content", sa.Text(), nullable=False),
            sa.Column("meta_data", sa.JSON(), nullable=True),
            sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id"), nullable=False),
        )

    if not _has_table("platform_config"):
        op.create_table(
            "platform_config",
            *_base_columns(),
            sa.Column("key", sa.String(), nullable=False),
            sa.Column("value", sa.Text(), nullable=False),
            sa.Column("category", sa.String(), server_default="general", nullable=False),
            sa.UniqueConstraint("key"),
        )
        op.create_index("ix_platform_config_key", "platform_config", ["key"])


def downgrade() -> None:
    for table in (
        "documents",
        "deals",
        "offers",
        "applications",
        "service_requests",
        "client_financing",
        "availability_slots",
        "showings",
        "leads",
        "pipeline_stages",
        "listing_media",
        "listings",
        "properties",
        "clients",
    ):
        op.execute(sa.text(f"DROP TABLE IF EXISTS {table} CASCADE"))

    if _has_column("tenants", "org_type"):
        op.drop_column("tenants", "org_type")
