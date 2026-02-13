"""AURIXA database models."""

from .base import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, JSON, ForeignKey, Text
from typing import List, Dict, Any
import datetime

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


class Tenant(Base):
    """Represents a single tenant organization (e.g., a hospital or clinic)."""
    __tablename__ = "tenants"

    name: Mapped[str] = mapped_column(String, unique=True)
    domain: Mapped[str] = mapped_column(String, unique=True, nullable=True)

    users: Mapped[List["User"]] = relationship(back_populates="tenant")
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
    
    appointments: Mapped[List["Appointment"]] = relationship(back_populates="patient")

class Appointment(Base):
    """Represents a single appointment."""
    __tablename__ = "appointments"

    start_time: Mapped[datetime.datetime] = mapped_column()
    end_time: Mapped[datetime.datetime] = mapped_column()
    provider_name: Mapped[str] = mapped_column(String) # e.g., Dr. Smith
    status: Mapped[str] = mapped_column(String, default="confirmed") # confirmed, cancelled, completed

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
