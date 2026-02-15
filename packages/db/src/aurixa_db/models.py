"""AURIXA database models."""

from .base import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, JSON, ForeignKey, Text, Integer, Index
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
