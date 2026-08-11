"""Seed the database with real estate demo data."""

import asyncio
import datetime
import os

from loguru import logger

from aurixa_db.database import AsyncSessionLocal, engine
from aurixa_db.models import (
    Application,
    AuditLog,
    AvailabilitySlot,
    Base,
    Client,
    ClientFinancing,
    Conversation,
    Deal,
    DeploymentEnvironment,
    Document,
    KnowledgeBaseArticle,
    Lead,
    Listing,
    ListingMedia,
    Offer,
    PipelineStage,
    PlatformConfig,
    Property,
    ServiceRequest,
    Showing,
    Staff,
    Tenant,
    User,
)


RESIDENTIAL_STAGES = [
    ("new", "New", 0, False),
    ("contacted", "Contacted", 1, False),
    ("qualified", "Qualified", 2, False),
    ("showing_scheduled", "Showing Scheduled", 3, False),
    ("showing_completed", "Showing Completed", 4, False),
    ("offer_submitted", "Offer Submitted", 5, False),
    ("under_contract", "Under Contract", 6, False),
    ("closed", "Closed", 7, True),
    ("lost", "Lost", 8, True),
]

PM_STAGES = [
    ("inquiry", "Inquiry", 0, False),
    ("tour_scheduled", "Tour Scheduled", 1, False),
    ("tour_completed", "Tour Completed", 2, False),
    ("application_started", "Application Started", 3, False),
    ("application_submitted", "Application Submitted", 4, False),
    ("approved", "Approved", 5, False),
    ("lease_signed", "Lease Signed", 6, True),
    ("moved_in", "Moved In", 7, True),
    ("lost", "Lost", 8, True),
]

DEVELOPER_STAGES = [
    ("inquiry", "Inquiry", 0, False),
    ("model_home_scheduled", "Model Home Scheduled", 1, False),
    ("model_home_completed", "Model Home Completed", 2, False),
    ("reservation", "Reservation", 3, False),
    ("under_contract", "Under Contract", 4, False),
    ("closed", "Closed", 5, True),
    ("lost", "Lost", 6, True),
]


async def seed_database() -> None:
    """Wipe and re-seed the database with real estate mock data."""

    async with engine.begin() as conn:
        logger.info("Dropping all tables...")
        await conn.run_sync(Base.metadata.drop_all)
        logger.info("Creating all tables...")
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        logger.info("Seeding real estate database...")

        tenants = [
            Tenant(
                name="Harbor Realty Group",
                domain="harborrealty.com",
                org_type="brokerage",
                plan="enterprise",
                status="active",
                api_key_count=5,
            ),
            Tenant(
                name="Urban Living PM",
                domain="urbanlivingpm.com",
                org_type="pm",
                plan="professional",
                status="active",
                api_key_count=3,
            ),
            Tenant(
                name="Summit Homes Development",
                domain="summithomes.dev",
                org_type="developer",
                plan="enterprise",
                status="active",
                api_key_count=4,
            ),
            Tenant(
                name="Lakeview Brokers",
                domain="lakeviewbrokers.com",
                org_type="brokerage",
                plan="starter",
                status="active",
                api_key_count=1,
            ),
        ]
        db.add_all(tenants)
        await db.commit()
        for tenant in tenants:
            await db.refresh(tenant)

        deployment_repository = os.getenv("GITHUB_REPOSITORY", "aurixa/aurixa")
        db.add_all(
            [
                DeploymentEnvironment(
                    name="staging",
                    display_name="Staging",
                    repository=deployment_repository,
                    github_environment="staging",
                    requires_approval=False,
                    configuration={"source": "local-seed"},
                ),
                DeploymentEnvironment(
                    name="production",
                    display_name="Production",
                    repository=deployment_repository,
                    github_environment="production",
                    requires_approval=True,
                    configuration={"source": "local-seed"},
                ),
            ]
        )

        for tenant, stages, segment in [
            (tenants[0], RESIDENTIAL_STAGES, "residential"),
            (tenants[1], PM_STAGES, "pm"),
            (tenants[2], DEVELOPER_STAGES, "developer"),
        ]:
            for slug, display_name, sort_order, is_terminal in stages:
                db.add(
                    PipelineStage(
                        tenant_id=tenant.id,
                        segment=segment,
                        slug=slug,
                        display_name=display_name,
                        sort_order=sort_order,
                        is_terminal=is_terminal,
                    )
                )
        await db.commit()

        users = [
            User(
                email="admin@harborrealty.com",
                hashed_password="fake-password",
                full_name="Harbor Admin",
                tenant_id=tenants[0].id,
            ),
            User(
                email="ops@urbanlivingpm.com",
                hashed_password="fake-password",
                full_name="Urban Ops",
                tenant_id=tenants[1].id,
            ),
        ]
        db.add_all(users)
        await db.commit()

        staff_list = [
            Staff(
                full_name="Alex Rivera",
                email="alex.rivera@harborrealty.com",
                role="agent",
                tenant_id=tenants[0].id,
            ),
            Staff(
                full_name="Jordan Lee",
                email="jordan.lee@harborrealty.com",
                role="broker",
                tenant_id=tenants[0].id,
            ),
            Staff(
                full_name="Sam Ortiz",
                email="sam.ortiz@harborrealty.com",
                role="showing_coordinator",
                tenant_id=tenants[0].id,
            ),
            Staff(
                full_name="Harbor Admin",
                email="admin@harborrealty.com",
                role="admin",
                tenant_id=tenants[0].id,
            ),
            Staff(
                full_name="Morgan Chen",
                email="morgan.chen@urbanlivingpm.com",
                role="leasing_coordinator",
                tenant_id=tenants[1].id,
            ),
            Staff(
                full_name="Riley Park",
                email="riley.park@urbanlivingpm.com",
                role="property_manager",
                tenant_id=tenants[1].id,
            ),
            Staff(
                full_name="Casey Brooks",
                email="casey.brooks@summithomes.dev",
                role="agent",
                tenant_id=tenants[2].id,
            ),
        ]
        db.add_all(staff_list)
        await db.commit()
        for member in staff_list:
            await db.refresh(member)

        conversations = [
            Conversation(session_id="conv-001", meta_data={"tenant_id": 1, "client_id": 1}),
            Conversation(session_id="conv-002", meta_data={"tenant_id": 1, "listing_id": 1}),
            Conversation(session_id="conv-003", meta_data={"tenant_id": 2, "client_id": 3}),
        ]
        db.add_all(conversations)
        await db.commit()

        clients = [
            Client(
                full_name="Jane Smith",
                email="jane.smith@email.com",
                phone_number="555-0101",
                client_type="buyer",
                tenant_id=tenants[0].id,
                preferences={"areas": ["Downtown", "Westside"], "budget_max": 500000, "beds_min": 3},
            ),
            Client(
                full_name="Michael Torres",
                email="m.torres@email.com",
                phone_number="555-0102",
                client_type="buyer",
                tenant_id=tenants[0].id,
                preferences={"areas": ["Suburbs"], "budget_max": 650000, "beds_min": 4},
            ),
            Client(
                full_name="Emily Nguyen",
                email="emily.nguyen@email.com",
                phone_number="555-0103",
                client_type="renter",
                tenant_id=tenants[1].id,
                preferences={"beds_min": 2, "pets": True},
            ),
            Client(
                full_name="David Kim",
                email="david.kim@email.com",
                client_type="seller",
                tenant_id=tenants[0].id,
            ),
            Client(
                full_name="Sarah Patel",
                email="sarah.patel@email.com",
                phone_number="555-0104",
                client_type="buyer",
                tenant_id=tenants[2].id,
            ),
        ]
        db.add_all(clients)
        await db.commit()
        for client in clients:
            await db.refresh(client)

        properties = [
            Property(
                tenant_id=tenants[0].id,
                address_line1="123 Oak Street",
                city="Portland",
                state="OR",
                postal_code="97201",
                property_type="single_family",
                beds=3,
                baths=2.0,
                sqft=1850,
                year_built=1998,
            ),
            Property(
                tenant_id=tenants[0].id,
                address_line1="456 Maple Avenue",
                city="Portland",
                state="OR",
                postal_code="97209",
                property_type="townhouse",
                beds=4,
                baths=2.5,
                sqft=2100,
                year_built=2015,
            ),
            Property(
                tenant_id=tenants[1].id,
                address_line1="789 River View #204",
                city="Portland",
                state="OR",
                postal_code="97204",
                property_type="condo",
                beds=2,
                baths=2.0,
                sqft=1100,
                year_built=2018,
            ),
            Property(
                tenant_id=tenants[2].id,
                address_line1="12 Summit Ridge Lane",
                city="Beaverton",
                state="OR",
                postal_code="97005",
                property_type="single_family",
                beds=4,
                baths=3.0,
                sqft=2450,
                year_built=2024,
            ),
        ]
        db.add_all(properties)
        await db.commit()
        for prop in properties:
            await db.refresh(prop)

        now = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
        listings = [
            Listing(
                tenant_id=tenants[0].id,
                property_id=properties[0].id,
                listing_type="sale",
                status="active",
                list_price=485000,
                marketing_title="Charming 3BR Craftsman near parks",
                marketing_description="Updated kitchen, fenced yard, walkable neighborhood.",
                published_at=now - datetime.timedelta(days=14),
            ),
            Listing(
                tenant_id=tenants[0].id,
                property_id=properties[1].id,
                listing_type="sale",
                status="active",
                list_price=625000,
                marketing_title="Modern townhouse with garage",
                marketing_description="Open floor plan, primary suite, low HOA.",
                published_at=now - datetime.timedelta(days=7),
            ),
            Listing(
                tenant_id=tenants[1].id,
                property_id=properties[2].id,
                listing_type="rent",
                status="active",
                rent_amount=2400,
                marketing_title="2BR river-view condo",
                marketing_description="Pet-friendly building with gym and rooftop deck.",
                published_at=now - datetime.timedelta(days=3),
            ),
            Listing(
                tenant_id=tenants[2].id,
                property_id=properties[3].id,
                listing_type="sale",
                status="active",
                list_price=789000,
                marketing_title="New construction at Summit Ridge",
                marketing_description="Model home now open — energy-efficient build with smart home package.",
                published_at=now - datetime.timedelta(days=1),
            ),
        ]
        db.add_all(listings)
        await db.commit()
        for listing in listings:
            await db.refresh(listing)

        db.add_all(
            [
                ListingMedia(
                    listing_id=listings[0].id,
                    media_type="photo",
                    url="https://images.example.com/oak-street/front.jpg",
                    caption="Front exterior",
                    sort_order=0,
                ),
                ListingMedia(
                    listing_id=listings[0].id,
                    media_type="virtual_tour",
                    url="https://tours.example.com/oak-street",
                    caption="3D walkthrough",
                    sort_order=1,
                ),
            ]
        )

        showings = [
            Showing(
                start_time=now + datetime.timedelta(days=1, hours=14),
                end_time=now + datetime.timedelta(days=1, hours=14, minutes=30),
                agent_name="Alex Rivera",
                staff_id=staff_list[0].id,
                notes="First-time buyer",
                showing_type="private_tour",
                status="confirmed",
                tenant_id=tenants[0].id,
                client_id=clients[0].id,
                listing_id=listings[0].id,
            ),
            Showing(
                start_time=now + datetime.timedelta(days=2, hours=11),
                end_time=now + datetime.timedelta(days=2, hours=11, minutes=30),
                agent_name="Alex Rivera",
                staff_id=staff_list[0].id,
                notes="Second showing",
                showing_type="private_tour",
                status="confirmed",
                tenant_id=tenants[0].id,
                client_id=clients[1].id,
                listing_id=listings[1].id,
            ),
            Showing(
                start_time=now + datetime.timedelta(days=3, hours=16),
                end_time=now + datetime.timedelta(days=3, hours=16, minutes=30),
                agent_name="Morgan Chen",
                staff_id=staff_list[4].id,
                notes="Rental tour",
                showing_type="private_tour",
                status="confirmed",
                tenant_id=tenants[1].id,
                client_id=clients[2].id,
                listing_id=listings[2].id,
            ),
            Showing(
                start_time=now - datetime.timedelta(days=2),
                end_time=now - datetime.timedelta(days=2) + datetime.timedelta(minutes=45),
                agent_name="Casey Brooks",
                staff_id=staff_list[6].id,
                notes="Model home visit",
                showing_type="open_house",
                status="completed",
                tenant_id=tenants[2].id,
                client_id=clients[4].id,
                listing_id=listings[3].id,
            ),
        ]
        db.add_all(showings)
        await db.commit()

        db.add_all(
            [
                ClientFinancing(
                    client_id=clients[0].id,
                    program_name="Conventional 30-year fixed",
                    lender="First National Bank",
                    reference_id="FNB-2026-8842",
                    deposit_amount="$12,000",
                    approved_amount=450000,
                    status="pre_approved",
                ),
                ClientFinancing(
                    client_id=clients[0].id,
                    program_name="Legacy active plan",
                    lender="First National Bank",
                    deposit_amount="$25",
                    status="active",
                ),
                ClientFinancing(
                    client_id=clients[1].id,
                    program_name="Jumbo loan",
                    lender="Pacific Mortgage",
                    deposit_amount="$25,000",
                    approved_amount=600000,
                    status="pending",
                ),
            ]
        )

        db.add_all(
            [
                ServiceRequest(
                    client_id=clients[2].id,
                    category="maintenance",
                    title="Kitchen faucet leak",
                    description="Slow drip under sink in unit 204",
                    status="open",
                    requested_at=now - datetime.timedelta(hours=6),
                    listing_id=listings[2].id,
                ),
                ServiceRequest(
                    client_id=clients[0].id,
                    category="application_follow_up",
                    title="Home warranty renewal",
                    description="Legacy execution-tool demo row",
                    status="active",
                ),
            ]
        )

        db.add_all(
            [
                Lead(
                    tenant_id=tenants[0].id,
                    client_id=clients[1].id,
                    listing_id=listings[1].id,
                    assigned_staff_id=staff_list[0].id,
                    full_name="Michael Torres",
                    email="m.torres@email.com",
                    phone_number="555-0102",
                    source="website",
                    stage="showing_scheduled",
                    segment="residential",
                ),
                Lead(
                    tenant_id=tenants[0].id,
                    listing_id=listings[0].id,
                    assigned_staff_id=staff_list[0].id,
                    full_name="Chris Anderson",
                    email="chris.anderson@email.com",
                    source="zillow",
                    stage="new",
                    segment="residential",
                ),
                Lead(
                    tenant_id=tenants[1].id,
                    client_id=clients[2].id,
                    listing_id=listings[2].id,
                    assigned_staff_id=staff_list[4].id,
                    full_name="Emily Nguyen",
                    email="emily.nguyen@email.com",
                    source="apartments.com",
                    stage="tour_scheduled",
                    segment="pm",
                ),
            ]
        )

        db.add(
            Application(
                tenant_id=tenants[1].id,
                client_id=clients[2].id,
                listing_id=listings[2].id,
                application_type="rental",
                status="submitted",
                submitted_at=now - datetime.timedelta(days=1),
            )
        )

        offer = Offer(
            tenant_id=tenants[0].id,
            client_id=clients[0].id,
            listing_id=listings[0].id,
            amount=475000,
            status="submitted",
            contingencies={"inspection": "10 days", "financing": "21 days"},
            submitted_at=now - datetime.timedelta(hours=12),
        )
        db.add(offer)
        await db.commit()
        await db.refresh(offer)

        db.add(
            Deal(
                tenant_id=tenants[0].id,
                client_id=clients[0].id,
                listing_id=listings[0].id,
                offer_id=offer.id,
                status="under_contract",
                milestone="inspection_scheduled",
            )
        )

        db.add(
            Document(
                tenant_id=tenants[1].id,
                client_id=clients[2].id,
                listing_id=listings[2].id,
                document_type="application",
                title="Rental application packet",
                status="uploaded",
            )
        )

        today = datetime.date.today()
        agents = ["Alex Rivera", "Jordan Lee", "Morgan Chen"]
        for day_offset in range(7):
            slot_date = today + datetime.timedelta(days=day_offset)
            for agent in agents:
                for start_time, end_time in [("09:00", "09:30"), ("10:00", "10:30"), ("14:00", "14:30")]:
                    db.add(
                        AvailabilitySlot(
                            slot_date=slot_date,
                            start_time=start_time,
                            end_time=end_time,
                            agent_name=agent,
                            tenant_id=tenants[0].id,
                        )
                    )
        await db.commit()

        kb_articles = [
            KnowledgeBaseArticle(
                title="Buyer Process Overview",
                content="Learn the steps from pre-approval to closing. Your agent will guide showings, offers, and inspections.",
                tenant_id=tenants[0].id,
            ),
            KnowledgeBaseArticle(
                title="Scheduling a Showing",
                content="Book a private tour through the client portal or ask the assistant for available times.",
                tenant_id=tenants[0].id,
            ),
            KnowledgeBaseArticle(
                title="Fair Housing Policy",
                content="We do not discriminate based on race, color, religion, sex, disability, familial status, or national origin.",
                tenant_id=tenants[0].id,
            ),
            KnowledgeBaseArticle(
                title="Rental Application Checklist",
                content="Bring photo ID, proof of income, and references. Application fee may apply.",
                tenant_id=tenants[1].id,
            ),
            KnowledgeBaseArticle(
                title="Pet Policy — River View",
                content="Cats and dogs under 50 lbs welcome with deposit. Breed restrictions apply per building policy.",
                tenant_id=tenants[1].id,
            ),
            KnowledgeBaseArticle(
                title="New Construction Incentives",
                content="Summit Ridge Phase 2 includes closing cost credits for contracts signed before month end.",
                tenant_id=tenants[2].id,
            ),
        ]
        db.add_all(kb_articles)

        audit_logs = [
            AuditLog(
                service="API Gateway",
                action="client.view",
                user="alex.rivera@harborrealty.com",
                details="Viewed client profile Jane Smith (id=1)",
                severity="info",
            ),
            AuditLog(
                service="Execution Engine",
                action="showing.create",
                user="system",
                details="Created showing for client 1 at listing 1",
                severity="info",
            ),
            AuditLog(
                service="Safety Guardrails",
                action="fair_housing.flag",
                user="system",
                details="Sanitized steering language in session conv-002",
                severity="warning",
            ),
            AuditLog(
                service="Orchestration Engine",
                action="Pipeline Complete",
                user="system",
                details="Pipeline session conv-001 completed successfully",
                severity="info",
            ),
            AuditLog(
                service="RAG Service",
                action="Knowledge Retrieved",
                user="system",
                details="Retrieved Fair Housing Policy for tenant 1",
                severity="info",
            ),
        ]
        db.add_all(audit_logs)

        config_entries = [
            PlatformConfig(key="rate_limit_per_minute", value="200", category="rate_limit"),
            PlatformConfig(key="max_conversations_per_tenant", value="10000", category="rate_limit"),
            PlatformConfig(key="feature_rag_enabled", value="true", category="feature"),
            PlatformConfig(key="feature_voice_enabled", value="true", category="feature"),
            PlatformConfig(key="feature_safety_guardrails", value="true", category="feature"),
            PlatformConfig(key="domain", value="real_estate", category="general"),
            PlatformConfig(key="default_llm_provider", value="openai", category="api"),
            PlatformConfig(key="environment", value="development", category="general"),
        ]
        db.add_all(config_entries)
        await db.commit()

        logger.info("Real estate database seeding complete.")


async def main() -> None:
    try:
        await seed_database()
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
