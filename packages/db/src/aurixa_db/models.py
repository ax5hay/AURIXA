"""AURIXA database models — real estate domain."""

from __future__ import annotations

import datetime
from typing import Any, Dict, List

from sqlalchemy import (
    Boolean,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship, synonym

from .base import Base


class AuditLog(Base):
    """Audit trail for system events."""

    __tablename__ = "audit_logs"

    service: Mapped[str] = mapped_column(String, index=True)
    action: Mapped[str] = mapped_column(String)
    user: Mapped[str] = mapped_column(String)
    details: Mapped[str] = mapped_column(Text)
    severity: Mapped[str] = mapped_column(String, default="info")


class Conversation(Base):
    """Represents a single conversation or session."""

    __tablename__ = "conversations"

    session_id: Mapped[str] = mapped_column(String, unique=True, index=True)
    meta_data: Mapped[Dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    pipeline_steps: Mapped[List["PipelineStep"]] = relationship(back_populates="conversation")


class PipelineStep(Base):
    """Represents a single step within a conversation pipeline."""

    __tablename__ = "pipeline_steps"

    conversation_id: Mapped[int] = mapped_column(ForeignKey("conversations.id"))
    step_name: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String)
    input: Mapped[Dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    output: Mapped[Dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    start_time: Mapped[float | None] = mapped_column(nullable=True)
    end_time: Mapped[float | None] = mapped_column(nullable=True)

    conversation: Mapped["Conversation"] = relationship(back_populates="pipeline_steps")


class Tenant(Base):
    """Organization on the platform: brokerage, PM company, or developer."""

    __tablename__ = "tenants"

    name: Mapped[str] = mapped_column(String, unique=True)
    domain: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)
    org_type: Mapped[str] = mapped_column(String, default="brokerage")
    plan: Mapped[str] = mapped_column(String, default="starter")
    status: Mapped[str] = mapped_column(String, default="active")
    api_key_count: Mapped[int] = mapped_column(Integer, default=0)

    users: Mapped[List["User"]] = relationship(back_populates="tenant")
    staff: Mapped[List["Staff"]] = relationship(back_populates="tenant")
    clients: Mapped[List["Client"]] = relationship(back_populates="tenant")
    properties: Mapped[List["Property"]] = relationship(back_populates="tenant")
    listings: Mapped[List["Listing"]] = relationship(back_populates="tenant")
    showings: Mapped[List["Showing"]] = relationship(back_populates="tenant")
    leads: Mapped[List["Lead"]] = relationship(back_populates="tenant")
    knowledge_articles: Mapped[List["KnowledgeBaseArticle"]] = relationship(back_populates="tenant")
    pipeline_stages: Mapped[List["PipelineStage"]] = relationship(back_populates="tenant")


class User(Base):
    """Dashboard / operator console user."""

    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String)
    full_name: Mapped[str | None] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True)

    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    tenant: Mapped["Tenant"] = relationship(back_populates="users")


class Staff(Base):
    """Organization staff."""

    __tablename__ = "staff"

    full_name: Mapped[str] = mapped_column(String)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    role: Mapped[str] = mapped_column(String, default="agent")
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    is_active: Mapped[bool] = mapped_column(default=True)

    tenant: Mapped["Tenant"] = relationship(back_populates="staff")
    assigned_leads: Mapped[List["Lead"]] = relationship(back_populates="assigned_staff")
    hosted_showings: Mapped[List["Showing"]] = relationship(back_populates="staff")


class Client(Base):
    """End client: buyer, renter, seller, or owner."""

    __tablename__ = "clients"

    full_name: Mapped[str] = mapped_column(String)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    phone_number: Mapped[str | None] = mapped_column(String, nullable=True)
    client_type: Mapped[str] = mapped_column(String, default="buyer")
    preferences: Mapped[Dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    tenant_id: Mapped[int | None] = mapped_column(ForeignKey("tenants.id"), nullable=True)

    tenant: Mapped["Tenant | None"] = relationship(back_populates="clients")
    showings: Mapped[List["Showing"]] = relationship(back_populates="client")
    financing: Mapped[List["ClientFinancing"]] = relationship(back_populates="client")
    service_requests: Mapped[List["ServiceRequest"]] = relationship(back_populates="client")
    applications: Mapped[List["Application"]] = relationship(back_populates="client")
    documents: Mapped[List["Document"]] = relationship(back_populates="client")
    leads: Mapped[List["Lead"]] = relationship(back_populates="client")
    offers: Mapped[List["Offer"]] = relationship(back_populates="client")
    deals: Mapped[List["Deal"]] = relationship(back_populates="client")


class ClientFinancing(Base):
    """Pre-approval, lender, and deposit terms."""

    __tablename__ = "client_financing"

    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"))
    program_name: Mapped[str] = mapped_column(String)
    lender: Mapped[str | None] = mapped_column(String, nullable=True)
    reference_id: Mapped[str | None] = mapped_column(String, nullable=True)
    deposit_amount: Mapped[str | None] = mapped_column(String, nullable=True)
    approved_amount: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String, default="pending")

    client: Mapped["Client"] = relationship(back_populates="financing")


class Property(Base):
    """Physical property asset."""

    __tablename__ = "properties"

    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    address_line1: Mapped[str] = mapped_column(String)
    address_line2: Mapped[str | None] = mapped_column(String, nullable=True)
    city: Mapped[str] = mapped_column(String)
    state: Mapped[str] = mapped_column(String)
    postal_code: Mapped[str] = mapped_column(String)
    country: Mapped[str] = mapped_column(String, default="US")
    property_type: Mapped[str] = mapped_column(String, default="single_family")
    beds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    baths: Mapped[float | None] = mapped_column(nullable=True)
    sqft: Mapped[int | None] = mapped_column(Integer, nullable=True)
    year_built: Mapped[int | None] = mapped_column(Integer, nullable=True)
    latitude: Mapped[float | None] = mapped_column(nullable=True)
    longitude: Mapped[float | None] = mapped_column(nullable=True)

    tenant: Mapped["Tenant"] = relationship(back_populates="properties")
    listings: Mapped[List["Listing"]] = relationship(back_populates="property")


class Listing(Base):
    """Market listing for a property."""

    __tablename__ = "listings"

    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    property_id: Mapped[int] = mapped_column(ForeignKey("properties.id"))
    listing_type: Mapped[str] = mapped_column(String, default="sale")
    status: Mapped[str] = mapped_column(String, default="draft")
    list_price: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rent_amount: Mapped[int | None] = mapped_column(Integer, nullable=True)
    marketing_title: Mapped[str | None] = mapped_column(String, nullable=True)
    marketing_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    external_id: Mapped[str | None] = mapped_column(String, nullable=True)
    external_source: Mapped[str | None] = mapped_column(String, nullable=True)
    published_at: Mapped[datetime.datetime | None] = mapped_column(nullable=True)

    tenant: Mapped["Tenant"] = relationship(back_populates="listings")
    property: Mapped["Property"] = relationship(back_populates="listings")
    media: Mapped[List["ListingMedia"]] = relationship(back_populates="listing")
    showings: Mapped[List["Showing"]] = relationship(back_populates="listing")
    offers: Mapped[List["Offer"]] = relationship(back_populates="listing")
    deals: Mapped[List["Deal"]] = relationship(back_populates="listing")
    applications: Mapped[List["Application"]] = relationship(back_populates="listing")
    service_requests: Mapped[List["ServiceRequest"]] = relationship(back_populates="listing")
    leads: Mapped[List["Lead"]] = relationship(back_populates="listing")


class ListingMedia(Base):
    """Photos, floor plans, and tour links."""

    __tablename__ = "listing_media"

    listing_id: Mapped[int] = mapped_column(ForeignKey("listings.id"))
    media_type: Mapped[str] = mapped_column(String, default="photo")
    url: Mapped[str] = mapped_column(Text)
    caption: Mapped[str | None] = mapped_column(String, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    listing: Mapped["Listing"] = relationship(back_populates="media")


class PipelineStage(Base):
    """Configurable pipeline stage per organization."""

    __tablename__ = "pipeline_stages"
    __table_args__ = (
        UniqueConstraint("tenant_id", "segment", "slug", name="uq_pipeline_stage_tenant_segment_slug"),
    )

    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    segment: Mapped[str] = mapped_column(String)
    slug: Mapped[str] = mapped_column(String)
    display_name: Mapped[str] = mapped_column(String)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_terminal: Mapped[bool] = mapped_column(Boolean, default=False)

    tenant: Mapped["Tenant"] = relationship(back_populates="pipeline_stages")


class Lead(Base):
    """Prospective client in the sales pipeline."""

    __tablename__ = "leads"

    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    client_id: Mapped[int | None] = mapped_column(ForeignKey("clients.id"), nullable=True)
    listing_id: Mapped[int | None] = mapped_column(ForeignKey("listings.id"), nullable=True)
    assigned_staff_id: Mapped[int | None] = mapped_column(ForeignKey("staff.id"), nullable=True)
    full_name: Mapped[str] = mapped_column(String)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    phone_number: Mapped[str | None] = mapped_column(String, nullable=True)
    source: Mapped[str] = mapped_column(String, default="website")
    stage: Mapped[str] = mapped_column(String, default="new")
    segment: Mapped[str] = mapped_column(String, default="residential")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    tenant: Mapped["Tenant"] = relationship(back_populates="leads")
    client: Mapped["Client | None"] = relationship(back_populates="leads")
    listing: Mapped["Listing | None"] = relationship(back_populates="leads")
    assigned_staff: Mapped["Staff | None"] = relationship(back_populates="assigned_leads")


class Showing(Base):
    """Scheduled property showing or related event."""

    __tablename__ = "showings"
    __table_args__ = (
        Index("ix_showings_client_status_start", "client_id", "status", "start_time"),
    )

    start_time: Mapped[datetime.datetime] = mapped_column()
    end_time: Mapped[datetime.datetime] = mapped_column()
    agent_name: Mapped[str] = mapped_column(String)
    staff_id: Mapped[int | None] = mapped_column(ForeignKey("staff.id"), nullable=True)
    notes: Mapped[str | None] = mapped_column(String, nullable=True)
    showing_type: Mapped[str] = mapped_column(String, default="private_tour")
    status: Mapped[str] = mapped_column(String, default="confirmed")

    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"))
    listing_id: Mapped[int | None] = mapped_column(ForeignKey("listings.id"), nullable=True)

    tenant: Mapped["Tenant"] = relationship(back_populates="showings")
    client: Mapped["Client"] = relationship(back_populates="showings")
    listing: Mapped["Listing | None"] = relationship(back_populates="showings")
    staff: Mapped["Staff | None"] = relationship(back_populates="hosted_showings")


class AvailabilitySlot(Base):
    """Agent or listing availability window."""

    __tablename__ = "availability_slots"

    slot_date: Mapped[datetime.date] = mapped_column()
    start_time: Mapped[str] = mapped_column(String)
    end_time: Mapped[str] = mapped_column(String)
    agent_name: Mapped[str] = mapped_column(String)
    staff_id: Mapped[int | None] = mapped_column(ForeignKey("staff.id"), nullable=True)
    listing_id: Mapped[int | None] = mapped_column(ForeignKey("listings.id"), nullable=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))


class ServiceRequest(Base):
    """Maintenance, lease renewal, or follow-up request."""

    __tablename__ = "service_requests"

    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"))
    category: Mapped[str] = mapped_column(String, default="maintenance")
    title: Mapped[str] = mapped_column(String)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String, default="open")
    requested_at: Mapped[datetime.datetime | None] = mapped_column(nullable=True)
    listing_id: Mapped[int | None] = mapped_column(ForeignKey("listings.id"), nullable=True)

    client: Mapped["Client"] = relationship(back_populates="service_requests")
    listing: Mapped["Listing | None"] = relationship(back_populates="service_requests")


class Application(Base):
    """Rental or purchase application."""

    __tablename__ = "applications"

    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"))
    listing_id: Mapped[int] = mapped_column(ForeignKey("listings.id"))
    application_type: Mapped[str] = mapped_column(String, default="rental")
    status: Mapped[str] = mapped_column(String, default="draft")
    submitted_at: Mapped[datetime.datetime | None] = mapped_column(nullable=True)

    client: Mapped["Client"] = relationship(back_populates="applications")
    listing: Mapped["Listing"] = relationship(back_populates="applications")


class Offer(Base):
    """Purchase offer on a listing."""

    __tablename__ = "offers"

    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"))
    listing_id: Mapped[int] = mapped_column(ForeignKey("listings.id"))
    amount: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String, default="draft")
    contingencies: Mapped[Dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    submitted_at: Mapped[datetime.datetime | None] = mapped_column(nullable=True)
    expires_at: Mapped[datetime.datetime | None] = mapped_column(nullable=True)

    client: Mapped["Client"] = relationship(back_populates="offers")
    listing: Mapped["Listing"] = relationship(back_populates="offers")
    deal: Mapped["Deal | None"] = relationship(back_populates="offer", uselist=False)


class Deal(Base):
    """Transaction from offer through close."""

    __tablename__ = "deals"

    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"))
    listing_id: Mapped[int] = mapped_column(ForeignKey("listings.id"))
    offer_id: Mapped[int | None] = mapped_column(ForeignKey("offers.id"), nullable=True)
    status: Mapped[str] = mapped_column(String, default="under_contract")
    milestone: Mapped[str | None] = mapped_column(String, nullable=True)
    closed_at: Mapped[datetime.datetime | None] = mapped_column(nullable=True)

    client: Mapped["Client"] = relationship(back_populates="deals")
    listing: Mapped["Listing"] = relationship(back_populates="deals")
    offer: Mapped["Offer | None"] = relationship(back_populates="deal")


class Document(Base):
    """Document metadata linked to a client."""

    __tablename__ = "documents"

    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"))
    listing_id: Mapped[int | None] = mapped_column(ForeignKey("listings.id"), nullable=True)
    deal_id: Mapped[int | None] = mapped_column(ForeignKey("deals.id"), nullable=True)
    document_type: Mapped[str] = mapped_column(String)
    title: Mapped[str] = mapped_column(String)
    storage_uri: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String, default="pending")

    client: Mapped["Client"] = relationship(back_populates="documents")


class KnowledgeBaseArticle(Base):
    """Tenant-scoped knowledge base article."""

    __tablename__ = "knowledge_base_articles"

    title: Mapped[str] = mapped_column(String)
    content: Mapped[str] = mapped_column(Text)
    meta_data: Mapped[Dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    tenant: Mapped["Tenant"] = relationship(back_populates="knowledge_articles")


class PlatformConfig(Base):
    """Key-value platform configuration."""

    __tablename__ = "platform_config"

    key: Mapped[str] = mapped_column(String, unique=True, index=True)
    value: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String, default="general")


class DeploymentEnvironment(Base):
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
    rollback_of_id: Mapped[int | None] = mapped_column(ForeignKey("deployment_releases.id"), nullable=True)

    environment: Mapped["DeploymentEnvironment"] = relationship(back_populates="releases")
    jobs: Mapped[List["DeploymentJob"]] = relationship(back_populates="release")


class DeploymentJob(Base):
    __tablename__ = "deployment_jobs"

    public_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    release_id: Mapped[int] = mapped_column(ForeignKey("deployment_releases.id"))
    kind: Mapped[str] = mapped_column(String(32), default="deploy")
    status: Mapped[str] = mapped_column(String(32), index=True)
    github_run_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    workflow_ref: Mapped[str | None] = mapped_column(String(512), nullable=True)
    cancel_requested: Mapped[bool] = mapped_column(Boolean, default=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime.datetime | None] = mapped_column(nullable=True)
    completed_at: Mapped[datetime.datetime | None] = mapped_column(nullable=True)

    release: Mapped["DeploymentRelease"] = relationship(back_populates="jobs")
    steps: Mapped[List["DeploymentStep"]] = relationship(back_populates="job")
    approvals: Mapped[List["DeploymentApproval"]] = relationship(back_populates="job")
    artifacts: Mapped[List["DeploymentArtifact"]] = relationship(back_populates="job")


class DeploymentStep(Base):
    __tablename__ = "deployment_steps"
    __table_args__ = (
        UniqueConstraint("job_id", "name", "attempt", name="uq_deployment_step_attempt"),
    )

    job_id: Mapped[int] = mapped_column(ForeignKey("deployment_jobs.id"))
    name: Mapped[str] = mapped_column(String(255))
    attempt: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(32))
    details: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    started_at: Mapped[datetime.datetime | None] = mapped_column(nullable=True)
    completed_at: Mapped[datetime.datetime | None] = mapped_column(nullable=True)

    job: Mapped["DeploymentJob"] = relationship(back_populates="steps")


class DeploymentApproval(Base):
    __tablename__ = "deployment_approvals"

    job_id: Mapped[int] = mapped_column(ForeignKey("deployment_jobs.id"))
    status: Mapped[str] = mapped_column(String(32), default="pending")
    requested_by: Mapped[str] = mapped_column(String(255))
    decided_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    decided_at: Mapped[datetime.datetime | None] = mapped_column(nullable=True)

    job: Mapped["DeploymentJob"] = relationship(back_populates="approvals")


class DeploymentArtifact(Base):
    __tablename__ = "deployment_artifacts"

    job_id: Mapped[int] = mapped_column(ForeignKey("deployment_jobs.id"))
    name: Mapped[str] = mapped_column(String(255))
    uri: Mapped[str] = mapped_column(Text)
    digest: Mapped[str | None] = mapped_column(String(255), nullable=True)
    media_type: Mapped[str | None] = mapped_column(String(255), nullable=True)
    metadata_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)

    job: Mapped["DeploymentJob"] = relationship(back_populates="artifacts")


class ServiceRevision(Base):
    __tablename__ = "service_revisions"
    __table_args__ = (
        UniqueConstraint("environment_id", "service_name", name="uq_service_revision_environment"),
    )

    environment_id: Mapped[int] = mapped_column(ForeignKey("deployment_environments.id"))
    release_id: Mapped[int] = mapped_column(ForeignKey("deployment_releases.id"))
    service_name: Mapped[str] = mapped_column(String(255))
    revision: Mapped[str] = mapped_column(String(255))
    image_digest: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="active")
    deployed_at: Mapped[datetime.datetime | None] = mapped_column(nullable=True)


class DeploymentAudit(Base):
    __tablename__ = "deployment_audit"

    actor: Mapped[str] = mapped_column(String(255), index=True)
    action: Mapped[str] = mapped_column(String(128), index=True)
    resource_type: Mapped[str] = mapped_column(String(64))
    resource_id: Mapped[str] = mapped_column(String(64), index=True)
    request_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    details: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)


# Backward compatibility until Phase 2 removes healthcare names.
Patient = Client
Appointment = Showing
PatientInsurance = ClientFinancing
Prescription = ServiceRequest

Showing.patient_id = synonym("client_id")
Showing.provider_name = synonym("agent_name")
Showing.reason = synonym("notes")

ClientFinancing.patient_id = synonym("client_id")
ClientFinancing.plan_name = synonym("program_name")
ClientFinancing.payer = synonym("lender")
ClientFinancing.member_id = synonym("reference_id")
ClientFinancing.copay = synonym("deposit_amount")

ServiceRequest.patient_id = synonym("client_id")
ServiceRequest.medication_name = synonym("title")
ServiceRequest.refill_requested_at = synonym("requested_at")

AvailabilitySlot.provider_name = synonym("agent_name")
