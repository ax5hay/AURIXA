"""Script to seed the database with mock data."""

import asyncio
from loguru import logger
import datetime

from aurixa_db.database import AsyncSessionLocal, engine
from aurixa_db.models import (
    Tenant, User, Patient, Appointment, KnowledgeBaseArticle,
    AuditLog, PlatformConfig, Conversation, Base,
    PatientInsurance, Prescription, AvailabilitySlot,
)


async def seed_database():
    """Wipe and re-seed the database with mock data."""
    
    async with engine.begin() as conn:
        logger.info("Dropping all tables...")
        await conn.run_sync(Base.metadata.drop_all)
        logger.info("Creating all tables...")
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        logger.info("Seeding database...")

        # Create Tenants (AURIXA healthcare tenants)
        tenants = [
            Tenant(name="General Hospital", domain="generalhospital.com", plan="enterprise", status="active", api_key_count=5),
            Tenant(name="Downtown Clinic", domain="downtownclinic.org", plan="professional", status="active", api_key_count=3),
            Tenant(name="Sunrise Medical Center", domain="sunrisemedical.com", plan="enterprise", status="active", api_key_count=8),
            Tenant(name="Family Care Associates", domain="familycare.net", plan="starter", status="active", api_key_count=1),
            Tenant(name="Metro Health Systems", domain="metrohealth.io", plan="professional", status="suspended", api_key_count=2),
            Tenant(name="Valley View Hospital", domain="valleyview.org", plan="enterprise", status="active", api_key_count=6),
            Tenant(name="Riverside Clinic", domain="riversideclinic.com", plan="starter", status="pending", api_key_count=0),
        ]
        for t in tenants:
            db.add(t)
        await db.commit()

        # Create Users
        users = [
            User(email="admin@generalhospital.com", hashed_password="fake-password", full_name="Admin GH", tenant_id=tenants[0].id),
            User(email="staff@downtownclinic.org", hashed_password="fake-password", full_name="Staff DC", tenant_id=tenants[1].id),
        ]
        for u in users:
            db.add(u)
        await db.commit()

        # Create Conversations (for analytics)
        conversations = [
            Conversation(session_id="conv-001", meta_data={"tenant_id": 1, "user_id": "u1"}),
            Conversation(session_id="conv-002", meta_data={"tenant_id": 1, "user_id": "u2"}),
            Conversation(session_id="conv-003", meta_data={"tenant_id": 2, "user_id": "u1"}),
        ]
        for c in conversations:
            db.add(c)
        await db.commit()

        # Create Patients (linked to tenants)
        patients = [
            Patient(full_name="John Doe", email="john.doe@email.com", tenant_id=tenants[0].id),
            Patient(full_name="Jane Smith", phone_number="123-456-7890", tenant_id=tenants[1].id),
            Patient(full_name="Alice Johnson", email="alice.j@email.com", phone_number="555-0101", tenant_id=tenants[0].id),
            Patient(full_name="Bob Williams", email="bob.w@email.com", tenant_id=tenants[0].id),
            Patient(full_name="Carol Davis", phone_number="555-0102", tenant_id=tenants[1].id),
        ]
        for p in patients:
            db.add(p)
        await db.commit()

        # Create Appointments (use naive UTC for TIMESTAMP WITHOUT TIME ZONE columns)
        # Use naive UTC for PostgreSQL TIMESTAMP WITHOUT TIME ZONE
        now = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
        appointments = [
            Appointment(
                start_time=now + datetime.timedelta(days=1),
                end_time=now + datetime.timedelta(days=1, hours=1),
                provider_name="Dr. Adams",
                reason="Annual checkup",
                status="confirmed",
                tenant_id=tenants[0].id,
                patient_id=patients[0].id,
            ),
            Appointment(
                start_time=now + datetime.timedelta(days=2),
                end_time=now + datetime.timedelta(days=2, hours=1),
                provider_name="Dr. Bell",
                reason="Follow-up",
                status="confirmed",
                tenant_id=tenants[1].id,
                patient_id=patients[1].id,
            ),
            Appointment(
                start_time=now + datetime.timedelta(days=3),
                end_time=now + datetime.timedelta(days=3, hours=1),
                provider_name="Dr. Chen",
                reason="Lab review",
                status="completed",
                tenant_id=tenants[0].id,
                patient_id=patients[0].id,
            ),
            Appointment(
                start_time=now + datetime.timedelta(days=5),
                end_time=now + datetime.timedelta(days=5, hours=1),
                provider_name="Dr. Adams",
                reason="General visit",
                status="confirmed",
                tenant_id=tenants[0].id,
                patient_id=patients[2].id,
            ),
        ]
        for a in appointments:
            db.add(a)
        await db.commit()

        # Create Patient Insurance
        insurances = [
            PatientInsurance(patient_id=patients[0].id, plan_name="In-Network PPO", payer="Aetna", copay="$25", status="active"),
            PatientInsurance(patient_id=patients[1].id, plan_name="UnitedHealthcare", payer="UHC", member_id="UHC-12345", copay="$30", status="active"),
            PatientInsurance(patient_id=patients[2].id, plan_name="Blue Cross PPO", payer="BCBS", copay="$20", status="active"),
            PatientInsurance(patient_id=patients[3].id, plan_name="Medicare", payer="CMS", copay="$0", status="active"),
        ]
        for i in insurances:
            db.add(i)
        await db.commit()

        # Create Prescriptions
        prescriptions = [
            Prescription(patient_id=patients[0].id, medication_name="Lisinopril 10mg", status="active"),
            Prescription(patient_id=patients[0].id, medication_name="Metformin 500mg", status="active"),
            Prescription(patient_id=patients[2].id, medication_name="Amlodipine 5mg", status="active"),
        ]
        for pr in prescriptions:
            db.add(pr)
        await db.commit()

        # Create Availability Slots (next 7 days)
        today = datetime.date.today()
        providers = ["Dr. Adams", "Dr. Bell", "Dr. Chen"]
        for d in range(7):
            slot_date = today + datetime.timedelta(days=d)
            for prov in providers:
                for st, et in [("09:00", "09:30"), ("10:00", "10:30"), ("14:00", "14:30")]:
                    db.add(AvailabilitySlot(
                        slot_date=slot_date,
                        start_time=st,
                        end_time=et,
                        provider_name=prov,
                        tenant_id=tenants[0].id,
                    ))
        await db.commit()

        # Create Knowledge Base Articles (patient-facing FAQ + admin)
        kb_articles = [
            KnowledgeBaseArticle(
                title="Billing Inquiries",
                content="For billing questions, please call 555-123-4567 or visit our patient portal. We accept most major insurance plans.",
                tenant_id=tenants[0].id,
            ),
            KnowledgeBaseArticle(
                title="Operating Hours",
                content="Our clinic is open Monday to Friday, 9am to 5pm. We are closed on weekends and public holidays.",
                tenant_id=tenants[1].id,
            ),
            KnowledgeBaseArticle(
                title="Appointment Scheduling",
                content="Schedule appointments through our patient portal or by calling 555-987-6543. Same-day appointments may be available.",
                tenant_id=tenants[0].id,
            ),
            KnowledgeBaseArticle(
                title="Lab Results",
                content="Lab results are typically available within 24-48 hours. You can view them in the patient portal under Results.",
                tenant_id=tenants[0].id,
            ),
            KnowledgeBaseArticle(
                title="Prescription Refills",
                content="Request prescription refills through the patient portal or by calling our pharmacy line at 555-321-7654. Allow 24 hours for processing.",
                tenant_id=tenants[0].id,
            ),
            KnowledgeBaseArticle(
                title="Contact Your Provider",
                content="Send a secure message to your provider anytime through the patient portal. Urgent matters should call our main line.",
                tenant_id=tenants[0].id,
            ),
        ]
        for kb in kb_articles:
            db.add(kb)
        await db.commit()

        # Create Audit Logs
        audit_logs = [
            AuditLog(service="Auth Service", action="User Login", user="admin@aurixa.io", details="Successful admin login from 192.168.1.1", severity="info"),
            AuditLog(service="API Gateway", action="Rate Limit Hit", user="tenant-key-03", details="Rate limit approached: 180 req/min on /api/v1/pipelines", severity="warning"),
            AuditLog(service="Orchestration Engine", action="Pipeline Complete", user="system", details="Pipeline session conv-abc123 completed successfully", severity="info"),
            AuditLog(service="Notification Hub", action="Service Degraded", user="system", details="High memory usage detected: 85% utilization", severity="error"),
            AuditLog(service="Orchestration Engine", action="Deployment", user="deploy-bot", details="Successfully deployed v0.1.0 to production", severity="info"),
            AuditLog(service="Auth Service", action="API Key Created", user="admin@generalhospital.com", details="New API key issued for General Hospital (prod-key-06)", severity="info"),
            AuditLog(service="RAG Service", action="Threshold Alert", user="system", details="Retrieval latency p95 exceeded 500ms", severity="warning"),
            AuditLog(service="LLM Router", action="Provider Fallback", user="system", details="OpenAI timeout, fell back to Anthropic", severity="warning"),
            AuditLog(service="API Gateway", action="Config Update", user="admin@aurixa.io", details="Updated CORS policy for tenant Downtown Clinic", severity="info"),
            AuditLog(service="Safety Guardrails", action="Content Filter", user="system", details="Blocked inappropriate content in pipeline session xyz789", severity="info"),
        ]
        for log in audit_logs:
            db.add(log)
        await db.commit()

        # Create Platform Config (for Configuration page)
        config_entries = [
            PlatformConfig(key="rate_limit_per_minute", value="200", category="rate_limit"),
            PlatformConfig(key="max_conversations_per_tenant", value="10000", category="rate_limit"),
            PlatformConfig(key="feature_rag_enabled", value="true", category="feature"),
            PlatformConfig(key="feature_voice_enabled", value="true", category="feature"),
            PlatformConfig(key="feature_safety_guardrails", value="true", category="feature"),
            PlatformConfig(key="api_gateway_timeout_ms", value="30000", category="api"),
            PlatformConfig(key="default_llm_provider", value="openai", category="api"),
            PlatformConfig(key="environment", value="development", category="general"),
            PlatformConfig(key="maintenance_mode", value="false", category="general"),
        ]
        for c in config_entries:
            db.add(c)
        await db.commit()

        logger.info("Database seeding complete.")


async def main():
    try:
        await seed_database()
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
