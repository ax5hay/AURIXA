"""add deployment control plane tables

Revision ID: 20260808_0001
Revises:
Create Date: 2026-08-08

This migration is intentionally additive. Existing production tables and data
are never dropped or recreated.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260808_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _base_columns() -> list[sa.Column]:
    return [
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("TIMEZONE('utc', now())"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("TIMEZONE('utc', now())"), nullable=False),
    ]


def upgrade() -> None:
    op.create_table(
        "deployment_environments",
        *_base_columns(),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("display_name", sa.String(255), nullable=False),
        sa.Column("repository", sa.String(255), nullable=False),
        sa.Column("github_environment", sa.String(255), nullable=False),
        sa.Column("requires_approval", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("configuration", sa.JSON(), server_default=sa.text("'{}'::json"), nullable=False),
        sa.UniqueConstraint("name"),
    )
    op.create_index("ix_deployment_environments_name", "deployment_environments", ["name"])

    op.create_table(
        "deployment_releases",
        *_base_columns(),
        sa.Column("public_id", sa.String(36), nullable=False),
        sa.Column("environment_id", sa.Integer(), sa.ForeignKey("deployment_environments.id"), nullable=False),
        sa.Column("version", sa.String(255), nullable=False),
        sa.Column("git_sha", sa.String(64), nullable=False),
        sa.Column("requested_by", sa.String(255), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("idempotency_key", sa.String(255), nullable=False),
        sa.Column("request_fingerprint", sa.String(64), nullable=False),
        sa.Column("metadata_json", sa.JSON(), server_default=sa.text("'{}'::json"), nullable=False),
        sa.Column("rollback_of_id", sa.Integer(), sa.ForeignKey("deployment_releases.id"), nullable=True),
        sa.UniqueConstraint("public_id"),
        sa.UniqueConstraint("environment_id", "idempotency_key", name="uq_deployment_release_idempotency"),
    )
    op.create_index("ix_deployment_releases_public_id", "deployment_releases", ["public_id"])
    op.create_index("ix_deployment_releases_status", "deployment_releases", ["status"])

    op.create_table(
        "deployment_jobs",
        *_base_columns(),
        sa.Column("public_id", sa.String(36), nullable=False),
        sa.Column("release_id", sa.Integer(), sa.ForeignKey("deployment_releases.id"), nullable=False),
        sa.Column("kind", sa.String(32), server_default="deploy", nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("github_run_id", sa.String(64), nullable=True),
        sa.Column("workflow_ref", sa.String(512), nullable=True),
        sa.Column("cancel_requested", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("public_id"),
    )
    op.create_index("ix_deployment_jobs_public_id", "deployment_jobs", ["public_id"])
    op.create_index("ix_deployment_jobs_status", "deployment_jobs", ["status"])
    op.create_index("ix_deployment_jobs_github_run_id", "deployment_jobs", ["github_run_id"])

    op.create_table(
        "deployment_steps",
        *_base_columns(),
        sa.Column("job_id", sa.Integer(), sa.ForeignKey("deployment_jobs.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("attempt", sa.Integer(), server_default="1", nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("details", sa.JSON(), server_default=sa.text("'{}'::json"), nullable=False),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("job_id", "name", "attempt", name="uq_deployment_step_attempt"),
    )
    op.create_table(
        "deployment_approvals",
        *_base_columns(),
        sa.Column("job_id", sa.Integer(), sa.ForeignKey("deployment_jobs.id"), nullable=False),
        sa.Column("status", sa.String(32), server_default="pending", nullable=False),
        sa.Column("requested_by", sa.String(255), nullable=False),
        sa.Column("decided_by", sa.String(255), nullable=True),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("decided_at", sa.DateTime(), nullable=True),
    )
    op.create_table(
        "deployment_artifacts",
        *_base_columns(),
        sa.Column("job_id", sa.Integer(), sa.ForeignKey("deployment_jobs.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("uri", sa.Text(), nullable=False),
        sa.Column("digest", sa.String(255), nullable=True),
        sa.Column("media_type", sa.String(255), nullable=True),
        sa.Column("metadata_json", sa.JSON(), server_default=sa.text("'{}'::json"), nullable=False),
    )
    op.create_table(
        "service_revisions",
        *_base_columns(),
        sa.Column("environment_id", sa.Integer(), sa.ForeignKey("deployment_environments.id"), nullable=False),
        sa.Column("release_id", sa.Integer(), sa.ForeignKey("deployment_releases.id"), nullable=False),
        sa.Column("service_name", sa.String(255), nullable=False),
        sa.Column("revision", sa.String(255), nullable=False),
        sa.Column("image_digest", sa.String(255), nullable=True),
        sa.Column("status", sa.String(32), server_default="active", nullable=False),
        sa.Column("deployed_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("environment_id", "service_name", name="uq_service_revision_environment"),
    )
    op.create_table(
        "deployment_audit",
        *_base_columns(),
        sa.Column("actor", sa.String(255), nullable=False),
        sa.Column("action", sa.String(128), nullable=False),
        sa.Column("resource_type", sa.String(64), nullable=False),
        sa.Column("resource_id", sa.String(64), nullable=False),
        sa.Column("request_id", sa.String(128), nullable=True),
        sa.Column("details", sa.JSON(), server_default=sa.text("'{}'::json"), nullable=False),
    )
    op.create_index("ix_deployment_audit_actor", "deployment_audit", ["actor"])
    op.create_index("ix_deployment_audit_action", "deployment_audit", ["action"])
    op.create_index("ix_deployment_audit_resource_id", "deployment_audit", ["resource_id"])

    # Defense in depth: application credentials cannot rewrite deployment audit history.
    op.execute(
        """
        CREATE OR REPLACE FUNCTION prevent_deployment_audit_mutation()
        RETURNS trigger AS $$
        BEGIN
          RAISE EXCEPTION 'deployment_audit is append-only';
        END;
        $$ LANGUAGE plpgsql
        """
    )
    op.execute(
        """
        CREATE TRIGGER deployment_audit_immutable
        BEFORE UPDATE OR DELETE ON deployment_audit
        FOR EACH ROW EXECUTE FUNCTION prevent_deployment_audit_mutation()
        """
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS deployment_audit_immutable ON deployment_audit")
    op.execute("DROP FUNCTION IF EXISTS prevent_deployment_audit_mutation()")
    for table in [
        "deployment_audit",
        "service_revisions",
        "deployment_artifacts",
        "deployment_approvals",
        "deployment_steps",
        "deployment_jobs",
        "deployment_releases",
        "deployment_environments",
    ]:
        op.drop_table(table)
