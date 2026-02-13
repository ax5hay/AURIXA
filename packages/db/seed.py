"""Script to seed the database with mock data."""

import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger
import datetime

from aurixa_db.database import AsyncSessionLocal, engine
from aurixa_db.models import Tenant, User, Patient, Appointment, KnowledgeBaseArticle, Base


async def seed_database():
    """Wipe and re-seed the database with mock data."""
    
    async with engine.begin() as conn:
        logger.info("Dropping all tables...")
        await conn.run_sync(Base.metadata.drop_all)
        logger.info("Creating all tables...")
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        logger.info("Seeding database...")

        # Create Tenants
        tenant1 = Tenant(name="General Hospital", domain="generalhospital.com")
        tenant2 = Tenant(name="Downtown Clinic", domain="downtownclinic.org")
        db.add_all([tenant1, tenant2])
        await db.commit()

        # Create Users
        user1 = User(email="admin@generalhospital.com", hashed_password="fake-password", full_name="Admin GH", tenant_id=tenant1.id)
        user2 = User(email="staff@downtownclinic.org", hashed_password="fake-password", full_name="Staff DC", tenant_id=tenant2.id)
        db.add_all([user1, user2])
        await db.commit()

        # Create Patients
        patient1 = Patient(full_name="John Doe", email="john.doe@email.com")
        patient2 = Patient(full_name="Jane Smith", phone_number="123-456-7890")
        db.add_all([patient1, patient2])
        await db.commit()
        
        # Create Appointments
        now = datetime.datetime.utcnow()
        appt1 = Appointment(
            start_time=now + datetime.timedelta(days=1),
            end_time=now + datetime.timedelta(days=1, hours=1),
            provider_name="Dr. Adams",
            status="confirmed",
            tenant_id=tenant1.id,
            patient_id=patient1.id,
        )
        appt2 = Appointment(
            start_time=now + datetime.timedelta(days=2),
            end_time=now + datetime.timedelta(days=2, hours=1),
            provider_name="Dr. Bell",
            status="confirmed",
            tenant_id=tenant2.id,
            patient_id=patient2.id,
        )
        db.add_all([appt1, appt2])
        await db.commit()

        # Create Knowledge Base Articles
        kb1 = KnowledgeBaseArticle(
            title="Billing Inquiries",
            content="For billing questions, please call 555-123-4567 or visit our patient portal.",
            tenant_id=tenant1.id,
        )
        kb2 = KnowledgeBaseArticle(
            title="Operating Hours",
            content="Our clinic is open Monday to Friday, 9am to 5pm. We are closed on weekends and public holidays.",
            tenant_id=tenant2.id,
        )
        db.add_all([kb1, kb2])
        await db.commit()

        logger.info("Database seeding complete.")


async def main():
    try:
        await seed_database()
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
