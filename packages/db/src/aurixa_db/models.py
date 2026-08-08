"""AURIXA database models."""

from .base import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, JSON, ForeignKey, Text, Integer, Index, UniqueConstraint, Boolean
from typing import List, Dict, Any
import datetime


class AuditLog(Base):
    """Audit trail for system events."""
    __tablename__ = "audit_logs"

    service: Mapped[str] = mapped_column(String, index=True)
    action: Mapped[str] = mapped_column(String)
    user: Mapped[str] = mapped_column(String)
    details: Mapped[str] = mapped_column(Text)
    severity: Mapped[str] = mapped_column(String, default="info")  # info, warning, error


class Conversation(Base):
    """Represents a single conversation or session."""
    __tablename__ = "conversations"

    session_id: Mapped[str] = mapped_column(String, unique=True, index=True)
    meta_data: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=True)

    pipeline_steps: Mapped[List["PipelineStep"]] = relationship(back_populates="conversation")

class PipelineStep(Base):
    """Represents a single step within a conversation pipeline."""
    __tablename__ = "pipeline_steps"

    conversation_id: Mapped[int] = mapped_column(ForeignKey("conversations.id"))
    step_name: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String)
    input: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=True)
    output: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=True)
    error_message: Mapped[str] = mapped_column(Text, nullable=True)
    start_time: Mapped[float] = mapped_column(nullable=True)
    end_time: Mapped[float] = mapped_column(nullable=True)

    conversation: Mapped["Conversation"] = relationship(back_populates="pipeline_steps")


class Staff(Base):
    """Hospital staff (reception, nurse, doctor, scheduler, admin)."""
    __tablename__ = "staff"

    full_name: Mapped[str] = mapped_column(String)
    email: Mapped[str] = mapped_column(String, nullable=True)
    role: Mapped[str] = mapped_column(String, default="reception")  # reception, nurse, doctor, scheduler, admin
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    is_active: Mapped[bool] = mapped_column(default=True)

    tenant: Mapped["Tenant"] = relationship(back_populates="staff")


class Tenant(Base):
    """Represents a single tenant organization (e.g., a hospital or clinic)."""
    __tablename__ = "tenants"

    name: Mapped[str] = mapped_column(String, unique=True)
    domain: Mapped[str] = mapped_column(String, unique=True, nullable=True)
    plan: Mapped[str] = mapped_column(String, default="starter")  # starter, professional, enterprise
    status: Mapped[str] = mapped_column(String, default="active")  # active, suspended, pending
    api_key_count: Mapped[int] = mapped_column(Integer, default=0)

    users: Mapped[List["User"]] = relationship(back_populates="tenant")
    staff: Mapped[List["Staff"]] = relationship(back_populates="tenant")
    appointments: Mapped[List["Appointment"]] = relationship(back_populates="tenant")
    knowledge_articles: Mapped[List["KnowledgeBaseArticle"]] = relationship(back_populates="tenant")

class User(Base):
    """Represents a user of the AURIXA admin console or dashboard."""
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String)
    full_name: Mapped[str] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True)
    
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    tenant: Mapped["Tenant"] = relationship(back_populates="users")

class Patient(Base):
    """Represents an end-user of a tenant (e.g., a patient)."""
    __tablename__ = "patients"

    full_name: Mapped[str] = mapped_column(String)
    email: Mapped[str] = mapped_column(String, nullable=True)
    phone_number: Mapped[str] = mapped_column(String, nullable=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), nullable=True)

    appointments: Mapped[List["Appointment"]] = relationship(back_populates="patient")
    insurance: Mapped[List["PatientInsurance"]] = relationship(back_populates="patient")
    prescriptions: Mapped[List["Prescription"]] = relationship(back_populates="patient")


class PatientInsurance(Base):
    """Insurance coverage for a patient."""
    __tablename__ = "patient_insurance"

    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"))
    plan_name: Mapped[str] = mapped_column(String)  # e.g., "In-Network PPO"
    payer: Mapped[str] = mapped_column(String, nullable=True)  # e.g., "Aetna"
    member_id: Mapped[str] = mapped_column(String, nullable=True)
    copay: Mapped[str] = mapped_column(String, default="$25")  # e.g., "$25"
    status: Mapped[str] = mapped_column(String, default="active")  # active, inactive

    patient: Mapped["Patient"] = relationship(back_populates="insurance")


class Prescription(Base):
    """Prescription for a patient."""
    __tablename__ = "prescriptions"

    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"))
    medication_name: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="active")  # active, refill_requested, filled
    refill_requested_at: Mapped[datetime.datetime] = mapped_column(nullable=True)

    patient: Mapped["Patient"] = relationship(back_populates="prescriptions")


class AvailabilitySlot(Base):
    """Available appointment slots (for scheduling)."""
    __tablename__ = "availability_slots"

    slot_date: Mapped[datetime.date] = mapped_column()
    start_time: Mapped[str] = mapped_column(String)  # e.g., "09:00"
    end_time: Mapped[str] = mapped_column(String)
    provider_name: Mapped[str] = mapped_column(String)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))


class Appointment(Base):
    """Represents a single appointment."""
    __tablename__ = "appointments"
    __table_args__ = (
        Index("ix_appointments_patient_status_start", "patient_id", "status", "start_time"),
    )

    start_time: Mapped[datetime.datetime] = mapped_column()
    end_time: Mapped[datetime.datetime] = mapped_column()
    provider_name: Mapped[str] = mapped_column(String)  # e.g., Dr. Smith
    reason: Mapped[str] = mapped_column(String, nullable=True)  # e.g., "Annual checkup"
    status: Mapped[str] = mapped_column(String, default="confirmed")  # confirmed, cancelled, completed

    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    tenant: Mapped["Tenant"] = relationship(back_populates="appointments")
    
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"))
    patient: Mapped["Patient"] = relationship(back_populates="appointments")

class KnowledgeBaseArticle(Base):
    """Represents an article in the RAG knowledge base."""
    __tablename__ = "knowledge_base_articles"

    title: Mapped[str] = mapped_column(String)
    content: Mapped[str] = mapped_column(Text)
    meta_data: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=True)

    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    tenant: Mapped["Tenant"] = relationship(back_populates="knowledge_articles")


class PlatformConfig(Base):
    """Key-value platform configuration (feature flags, rate limits, etc.)."""
    __tablename__ = "platform_config"

    key: Mapped[str] = mapped_column(String, unique=True, index=True)
    value: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String, default="general")  # general, rate_limit, feature, api


class DeploymentEnvironment(Base):
    """A named deployment target controlled by the deployment service."""
    __tablename__ = "deployment_environments"

    name: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(255))
    repository: Mapped[str] = mapped_column(String(255))
    github_environment: Mapped[str] = mapped_column(String(255))
    requires_approval: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    configuration: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)

    releases: Mapped[List["DeploymentRelease"]] = relationship(back_populates="environment")


class DeploymentRelease(Base):
    """An immutable release candidate for one environment."""
    __tablename__ = "deployment_releases"
    __table_args__ = (
        UniqueConstraint("environment_id", "idempotency_key", name="uq_deployment_release_idempotency"),
    )

    public_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    environment_id: Mapped[int] = mapped_column(ForeignKey("deployment_environments.id"))
    version: Mapped[str] = mapped_column(String(255))
    git_sha: Mapped[str] = mapped_column(String(64))
    requested_by: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(32), index=True)
    idempotency_key: Mapped[str] = mapped_column(String(255))
    request_fingerprint: Mapped[str] = mapped_column(String(64))
    metadata_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    rollback_of_id: Mapped[int] = mapped_column(ForeignKey("deployment_releases.id"), nullable=True)

    environment: Mapped["DeploymentEnvironment"] = relationship(back_populates="releases")
    jobs: Mapped[List["DeploymentJob"]] = relationship(back_populates="release")


class DeploymentJob(Base):
    """Execution record for a release, cancel, or rollback request."""
    __tablename__ = "deployment_jobs"

    public_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    release_id: Mapped[int] = mapped_column(ForeignKey("deployment_releases.id"))
    kind: Mapped[str] = mapped_column(String(32), default="deploy")
    status: Mapped[str] = mapped_column(String(32), index=True)
    github_run_id: Mapped[str] = mapped_column(String(64), nullable=True, index=True)
    workflow_ref: Mapped[str] = mapped_column(String(512), nullable=True)
    cancel_requested: Mapped[bool] = mapped_column(Boolean, default=False)
    error_message: Mapped[str] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime.datetime] = mapped_column(nullable=True)
    completed_at: Mapped[datetime.datetime] = mapped_column(nullable=True)

    release: Mapped["DeploymentRelease"] = relationship(back_populates="jobs")
    steps: Mapped[List["DeploymentStep"]] = relationship(back_populates="job")
    approvals: Mapped[List["DeploymentApproval"]] = relationship(back_populates="job")
    artifacts: Mapped[List["DeploymentArtifact"]] = relationship(back_populates="job")


class DeploymentStep(Base):
    """A workflow step reported by GitHub Actions."""
    __tablename__ = "deployment_steps"
    __table_args__ = (
        UniqueConstraint("job_id", "name", "attempt", name="uq_deployment_step_attempt"),
    )

    job_id: Mapped[int] = mapped_column(ForeignKey("deployment_jobs.id"))
    name: Mapped[str] = mapped_column(String(255))
    attempt: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(32))
    details: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    started_at: Mapped[datetime.datetime] = mapped_column(nullable=True)
    completed_at: Mapped[datetime.datetime] = mapped_column(nullable=True)

    job: Mapped["DeploymentJob"] = relationship(back_populates="steps")


class DeploymentApproval(Base):
    """Approval decision associated with a deployment job."""
    __tablename__ = "deployment_approvals"

    job_id: Mapped[int] = mapped_column(ForeignKey("deployment_jobs.id"))
    status: Mapped[str] = mapped_column(String(32), default="pending")
    requested_by: Mapped[str] = mapped_column(String(255))
    decided_by: Mapped[str] = mapped_column(String(255), nullable=True)
    comment: Mapped[str] = mapped_column(Text, nullable=True)
    decided_at: Mapped[datetime.datetime] = mapped_column(nullable=True)

    job: Mapped["DeploymentJob"] = relationship(back_populates="approvals")


class DeploymentArtifact(Base):
    """Artifact metadata reported by a trusted workflow."""
    __tablename__ = "deployment_artifacts"

    job_id: Mapped[int] = mapped_column(ForeignKey("deployment_jobs.id"))
    name: Mapped[str] = mapped_column(String(255))
    uri: Mapped[str] = mapped_column(Text)
    digest: Mapped[str] = mapped_column(String(255), nullable=True)
    media_type: Mapped[str] = mapped_column(String(255), nullable=True)
    metadata_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)

    job: Mapped["DeploymentJob"] = relationship(back_populates="artifacts")


class ServiceRevision(Base):
    """Last known service revision in an environment."""
    __tablename__ = "service_revisions"
    __table_args__ = (
        UniqueConstraint("environment_id", "service_name", name="uq_service_revision_environment"),
    )

    environment_id: Mapped[int] = mapped_column(ForeignKey("deployment_environments.id"))
    release_id: Mapped[int] = mapped_column(ForeignKey("deployment_releases.id"))
    service_name: Mapped[str] = mapped_column(String(255))
    revision: Mapped[str] = mapped_column(String(255))
    image_digest: Mapped[str] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="active")
    deployed_at: Mapped[datetime.datetime] = mapped_column(nullable=True)


class DeploymentAudit(Base):
    """Append-only deployment control-plane audit event."""
    __tablename__ = "deployment_audit"

    actor: Mapped[str] = mapped_column(String(255), index=True)
    action: Mapped[str] = mapped_column(String(128), index=True)
    resource_type: Mapped[str] = mapped_column(String(64))
    resource_id: Mapped[str] = mapped_column(String(64), index=True)
    request_id: Mapped[str] = mapped_column(String(128), nullable=True)
    details: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
