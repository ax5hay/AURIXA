"""Seed the database with real estate demo data (~60% US / ~40% India)."""

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
    PipelineStep,
    PlatformConfig,
    Property,
    ServiceRequest,
    Showing,
    Staff,
    Tenant,
    User,
)

from seed_random import (
    DEFAULT_RANDOM_SEED,
    TARGET_CLIENT_TOTAL,
    bulk_insert_clients,
    bulk_insert_listings,
    bulk_insert_properties,
    compute_random_counts,
    generate_client_specs,
    generate_lead_specs,
    generate_listing_specs_for_indices,
    generate_property_specs,
    generate_showing_specs,
)
from seed_data import (
    CONVERSATION_SEEDS,
    IN_CLIENTS,
    IN_KB_ARTICLES,
    IN_LEADS,
    IN_LISTINGS,
    IN_PROPERTIES,
    IN_SHOWINGS,
    IN_STAFF,
    IN_TENANTS,
    US_CLIENTS,
    US_KB_ARTICLES,
    US_LEADS,
    US_LISTINGS,
    US_PROPERTIES,
    US_SHOWINGS,
    US_STAFF,
    US_TENANTS,
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


def _add_pipeline_stages(db, tenants) -> None:
    for tenant, stages, segment in [
        (tenants[0], RESIDENTIAL_STAGES, "residential"),
        (tenants[1], PM_STAGES, "pm"),
        (tenants[2], DEVELOPER_STAGES, "developer"),
        (tenants[4], RESIDENTIAL_STAGES, "residential"),
        (tenants[5], PM_STAGES, "pm"),
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


def _build_showing(now, spec, tenants, clients, listings, staff_list):
    start = now + datetime.timedelta(days=spec["days_offset"], hours=spec["hour"])
    end = start + datetime.timedelta(minutes=30 if spec["showing_type"] != "open_house" else 45)
    listing_id = listings[spec["listing_index"]].id if spec.get("listing_index") is not None else None
    staff_id = staff_list[spec["staff_index"]].id if spec.get("staff_index") is not None else None
    agent_name = spec.get("agent_name")
    if not agent_name and spec.get("staff_index") is not None:
        agent_name = staff_list[spec["staff_index"]].full_name
    agent_name = agent_name or "Agent"
    return Showing(
        start_time=start,
        end_time=end,
        agent_name=agent_name,
        staff_id=staff_id,
        notes=spec.get("notes"),
        showing_type=spec["showing_type"],
        status=spec["status"],
        tenant_id=tenants[spec["tenant_index"]].id,
        client_id=clients[spec["client_index"]].id,
        listing_id=listing_id,
    )


async def seed_database() -> None:
    """Wipe and re-seed the database with real estate mock data."""

    async with engine.begin() as conn:
        logger.info("Dropping all tables...")
        await conn.run_sync(Base.metadata.drop_all)
        logger.info("Creating all tables...")
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        logger.info("Seeding real estate database (60%% US / 40%% IN)...")

        tenants = [
            Tenant(status="active", **spec)
            for spec in [*US_TENANTS, *IN_TENANTS]
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
        _add_pipeline_stages(db, tenants)

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
            User(
                email="admin@bengaluruprime.in",
                hashed_password="fake-password",
                full_name="Bengaluru Admin",
                tenant_id=tenants[4].id,
            ),
            User(
                email="ops@mumbaiurbanliving.in",
                hashed_password="fake-password",
                full_name="Mumbai Ops",
                tenant_id=tenants[5].id,
            ),
        ]
        db.add_all(users)
        await db.commit()

        staff_list: list[Staff] = []
        for spec in [*US_STAFF, *IN_STAFF]:
            staff_list.append(
                Staff(
                    full_name=spec["full_name"],
                    email=spec["email"],
                    role=spec["role"],
                    tenant_id=tenants[spec["tenant_index"]].id,
                )
            )
        db.add_all(staff_list)
        await db.commit()
        for member in staff_list:
            await db.refresh(member)

        clients: list[Client] = []
        for spec in [*US_CLIENTS, *IN_CLIENTS]:
            clients.append(
                Client(
                    full_name=spec["full_name"],
                    email=spec.get("email"),
                    phone_number=spec.get("phone_number"),
                    client_type=spec.get("client_type", "buyer"),
                    tenant_id=tenants[spec["tenant_index"]].id,
                    preferences=spec.get("preferences"),
                )
            )
        db.add_all(clients)
        await db.commit()
        for client in clients:
            await db.refresh(client)

        curated_client_count = len(clients)
        curated_property_count = len(US_PROPERTIES) + len(IN_PROPERTIES)
        random_counts = compute_random_counts(
            curated_client_count,
            curated_property_count,
            TARGET_CLIENT_TOTAL,
        )
        logger.info(
            "Generating {} random clients (~60%% US / ~40%% IN)...",
            random_counts["random_us_clients"] + random_counts["random_in_clients"],
        )
        random_us_client_specs, random_in_client_specs = generate_client_specs(
            random_counts["random_us_clients"],
            random_counts["random_in_clients"],
            seed=DEFAULT_RANDOM_SEED,
        )
        extra_clients = await bulk_insert_clients(
            db,
            [*random_us_client_specs, *random_in_client_specs],
            tenants,
        )
        clients.extend(extra_clients)

        properties: list[Property] = []
        for spec, country in [(s, "US") for s in US_PROPERTIES] + [(s, "IN") for s in IN_PROPERTIES]:
            properties.append(
                Property(
                    tenant_id=tenants[spec["tenant_index"]].id,
                    address_line1=spec["address_line1"],
                    city=spec["city"],
                    state=spec["state"],
                    postal_code=spec["postal_code"],
                    country=country,
                    property_type=spec["property_type"],
                    beds=spec.get("beds"),
                    baths=spec.get("baths"),
                    sqft=spec.get("sqft"),
                    year_built=spec.get("year_built"),
                )
            )
        db.add_all(properties)
        await db.commit()
        for prop in properties:
            await db.refresh(prop)

        if random_counts["random_us_properties"] + random_counts["random_in_properties"] > 0:
            logger.info(
                "Generating {} random properties...",
                random_counts["random_us_properties"] + random_counts["random_in_properties"],
            )
            random_us_prop_specs, random_in_prop_specs = generate_property_specs(
                random_counts["random_us_properties"],
                random_counts["random_in_properties"],
                seed=DEFAULT_RANDOM_SEED,
            )
            extra_properties = await bulk_insert_properties(
                db,
                random_us_prop_specs,
                random_in_prop_specs,
                tenants,
            )
            properties.extend(extra_properties)

        now = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
        listings: list[Listing] = []
        for spec in [*US_LISTINGS, *IN_LISTINGS]:
            listings.append(
                Listing(
                    tenant_id=tenants[spec["tenant_index"]].id,
                    property_id=properties[spec["property_index"]].id,
                    listing_type=spec["listing_type"],
                    status=spec["status"],
                    list_price=spec.get("list_price"),
                    rent_amount=spec.get("rent_amount"),
                    marketing_title=spec.get("marketing_title"),
                    marketing_description=spec.get("marketing_description"),
                    published_at=now - datetime.timedelta(days=spec.get("days_published", 1)),
                )
            )
        db.add_all(listings)
        await db.commit()
        for listing in listings:
            await db.refresh(listing)

        tenant_id_to_index = {tenant.id: index for index, tenant in enumerate(tenants)}
        random_property_meta: list[tuple[int, int, str]] = []
        for index, prop in enumerate(properties):
            if index < curated_property_count:
                continue
            tenant_index = tenant_id_to_index[prop.tenant_id]
            random_property_meta.append((index, tenant_index, prop.country))

        if random_property_meta:
            logger.info("Generating {} random listings...", len(random_property_meta))
            random_listing_specs = generate_listing_specs_for_indices(
                random_property_meta,
                seed=DEFAULT_RANDOM_SEED,
            )
            extra_listings = await bulk_insert_listings(
                db,
                random_listing_specs,
                tenants,
                properties,
                now,
            )
            listings.extend(extra_listings)

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
                ListingMedia(
                    listing_id=listings[12].id,
                    media_type="photo",
                    url="https://images.example.in/koramangala/living.jpg",
                    caption="Living room — Koramangala 3BHK",
                    sort_order=0,
                ),
                ListingMedia(
                    listing_id=listings[14].id,
                    media_type="photo",
                    url="https://images.example.in/mumbai/lower-parel/view.jpg",
                    caption="Sea glimpse from balcony",
                    sort_order=0,
                ),
            ]
        )

        showings = [
            _build_showing(now, spec, tenants, clients, listings, staff_list)
            for spec in [*US_SHOWINGS, *IN_SHOWINGS]
        ]
        db.add_all(showings)
        await db.commit()

        if random_counts["random_showings"] > 0:
            logger.info("Generating {} random showings...", random_counts["random_showings"])
            random_showing_specs = generate_showing_specs(
                len(clients),
                len(listings),
                len(staff_list),
                random_counts["random_showings"],
                seed=DEFAULT_RANDOM_SEED,
            )
            random_showings = [
                _build_showing(now, spec, tenants, clients, listings, staff_list)
                for spec in random_showing_specs
            ]
            for start in range(0, len(random_showings), 200):
                batch = random_showings[start : start + 200]
                db.add_all(batch)
                await db.commit()
            showings.extend(random_showings)

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
                    client_id=clients[1].id,
                    program_name="Jumbo loan",
                    lender="Pacific Mortgage",
                    deposit_amount="$25,000",
                    approved_amount=600000,
                    status="pending",
                ),
                ClientFinancing(
                    client_id=clients[12].id,
                    program_name="SBI Home Loan",
                    lender="State Bank of India",
                    reference_id="SBI-HL-2026-4412",
                    deposit_amount="₹5,00,000",
                    approved_amount=12000000,
                    status="pre_approved",
                ),
                ClientFinancing(
                    client_id=clients[13].id,
                    program_name="HDFC NRI Home Loan",
                    lender="HDFC Bank",
                    reference_id="HDFC-NRI-9921",
                    deposit_amount="₹10,00,000",
                    approved_amount=20000000,
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
                    client_id=clients[14].id,
                    category="maintenance",
                    title="AC service — Powai flat",
                    description="Split unit not cooling in master bedroom",
                    status="open",
                    requested_at=now - datetime.timedelta(hours=3),
                    listing_id=listings[15].id,
                ),
                ServiceRequest(
                    client_id=clients[7].id,
                    category="application_follow_up",
                    title="Lease renewal question",
                    description="Asking about 12-month extension terms",
                    status="active",
                    requested_at=now - datetime.timedelta(days=1),
                    listing_id=listings[8].id,
                ),
            ]
        )

        leads: list[Lead] = []
        for spec in [*US_LEADS, *IN_LEADS]:
            leads.append(
                Lead(
                    tenant_id=tenants[spec["tenant_index"]].id,
                    client_id=clients[spec["client_index"]].id if spec.get("client_index") is not None else None,
                    listing_id=listings[spec["listing_index"]].id if spec.get("listing_index") is not None else None,
                    assigned_staff_id=staff_list[spec["staff_index"]].id if spec.get("staff_index") is not None else None,
                    full_name=spec["full_name"],
                    email=spec.get("email"),
                    phone_number=spec.get("phone_number"),
                    source=spec["source"],
                    stage=spec["stage"],
                    segment=spec["segment"],
                )
            )
        db.add_all(leads)

        if random_counts["random_leads"] > 0:
            logger.info("Generating {} random leads...", random_counts["random_leads"])
            random_lead_specs = generate_lead_specs(
                len(clients),
                len(listings),
                len(staff_list),
                random_counts["random_leads"],
                seed=DEFAULT_RANDOM_SEED,
            )
            random_leads = [
                Lead(
                    tenant_id=tenants[spec["tenant_index"]].id,
                    client_id=clients[spec["client_index"]].id
                    if spec.get("client_index") is not None
                    else None,
                    listing_id=listings[spec["listing_index"]].id
                    if spec.get("listing_index") is not None
                    else None,
                    assigned_staff_id=staff_list[spec["staff_index"]].id
                    if spec.get("staff_index") is not None
                    else None,
                    full_name=spec["full_name"],
                    email=spec.get("email"),
                    phone_number=spec.get("phone_number"),
                    source=spec["source"],
                    stage=spec["stage"],
                    segment=spec["segment"],
                )
                for spec in random_lead_specs
            ]
            for start in range(0, len(random_leads), 200):
                db.add_all(random_leads[start : start + 200])
                await db.commit()
            leads.extend(random_leads)

        db.add_all(
            [
                Application(
                    tenant_id=tenants[1].id,
                    client_id=clients[2].id,
                    listing_id=listings[2].id,
                    application_type="rental",
                    status="submitted",
                    submitted_at=now - datetime.timedelta(days=1),
                ),
                Application(
                    tenant_id=tenants[5].id,
                    client_id=clients[14].id,
                    listing_id=listings[14].id,
                    application_type="rental",
                    status="under_review",
                    submitted_at=now - datetime.timedelta(hours=18),
                ),
                Application(
                    tenant_id=tenants[4].id,
                    client_id=clients[12].id,
                    listing_id=listings[12].id,
                    application_type="purchase",
                    status="submitted",
                    submitted_at=now - datetime.timedelta(days=2),
                ),
            ]
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

        in_offer = Offer(
            tenant_id=tenants[4].id,
            client_id=clients[12].id,
            listing_id=listings[12].id,
            amount=12200000,
            status="submitted",
            contingencies={"registration": "45 days", "home_loan": "30 days"},
            submitted_at=now - datetime.timedelta(hours=8),
        )
        db.add(in_offer)
        await db.commit()
        await db.refresh(in_offer)

        db.add_all(
            [
                Deal(
                    tenant_id=tenants[0].id,
                    client_id=clients[0].id,
                    listing_id=listings[0].id,
                    offer_id=offer.id,
                    status="under_contract",
                    milestone="inspection_scheduled",
                ),
                Deal(
                    tenant_id=tenants[4].id,
                    client_id=clients[12].id,
                    listing_id=listings[12].id,
                    offer_id=in_offer.id,
                    status="under_contract",
                    milestone="loan_sanction_pending",
                ),
            ]
        )

        db.add_all(
            [
                Document(
                    tenant_id=tenants[1].id,
                    client_id=clients[2].id,
                    listing_id=listings[2].id,
                    document_type="application",
                    title="Rental application packet",
                    status="uploaded",
                ),
                Document(
                    tenant_id=tenants[5].id,
                    client_id=clients[14].id,
                    listing_id=listings[14].id,
                    document_type="application",
                    title="Leave and license agreement draft",
                    status="uploaded",
                ),
                Document(
                    tenant_id=tenants[4].id,
                    client_id=clients[12].id,
                    listing_id=listings[12].id,
                    document_type="offer",
                    title="MOU — Koramangala 3BHK",
                    status="signed",
                ),
            ]
        )

        today = datetime.date.today()
        us_agents = ["Alex Rivera", "Jordan Lee", "Morgan Chen", "Taylor Walsh"]
        in_agents = ["Priya Sharma", "Arjun Mehta", "Kavitha Nair"]
        for day_offset in range(7):
            slot_date = today + datetime.timedelta(days=day_offset)
            for agent in us_agents:
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
            for agent in in_agents:
                for start_time, end_time in [("10:30", "11:00"), ("15:00", "15:30"), ("17:00", "17:30")]:
                    db.add(
                        AvailabilitySlot(
                            slot_date=slot_date,
                            start_time=start_time,
                            end_time=end_time,
                            agent_name=agent,
                            tenant_id=tenants[4].id,
                        )
                    )
        await db.commit()

        kb_articles = [
            KnowledgeBaseArticle(
                title=spec["title"],
                content=spec["content"],
                tenant_id=tenants[spec["tenant_index"]].id,
            )
            for spec in [*US_KB_ARTICLES, *IN_KB_ARTICLES]
        ]
        db.add_all(kb_articles)

        conversations: list[Conversation] = []
        for spec in CONVERSATION_SEEDS:
            meta: dict = {"tenant_id": tenants[spec["tenant_index"]].id}
            if spec.get("client_index") is not None:
                meta["client_id"] = clients[spec["client_index"]].id
            if spec.get("listing_index") is not None:
                meta["listing_id"] = listings[spec["listing_index"]].id
            conversations.append(Conversation(session_id=spec["session_id"], meta_data=meta))
        db.add_all(conversations)
        await db.commit()
        for convo in conversations:
            await db.refresh(convo)

        for convo, spec in zip(conversations, CONVERSATION_SEEDS, strict=True):
            if not spec.get("prompt"):
                continue
            ts = now.timestamp()
            db.add(
                PipelineStep(
                    conversation_id=convo.id,
                    step_name="classify_intent",
                    status="completed",
                    input={"prompt": spec["prompt"]},
                    output={"intent": "general_inquiry"},
                    start_time=ts,
                    end_time=ts + 0.2,
                )
            )
            db.add(
                PipelineStep(
                    conversation_id=convo.id,
                    step_name="generate_response",
                    status="completed",
                    input={"prompt": spec["prompt"]},
                    output={"content": spec.get("response", "")},
                    start_time=ts + 0.3,
                    end_time=ts + 1.5,
                )
            )

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
                details="Created showing for client 1 at listing 1 (Portland, US)",
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
                action="pipeline.complete",
                user="system",
                details="Pipeline session conv-004 completed for Bengaluru client",
                severity="info",
            ),
            AuditLog(
                service="RAG Service",
                action="knowledge.retrieved",
                user="system",
                details="Retrieved RERA Registration Checklist for tenant Bengaluru Prime",
                severity="info",
            ),
            AuditLog(
                service="API Gateway",
                action="client.view",
                user="priya.sharma@bengaluruprime.in",
                details="Viewed client profile Ananya Iyer (Koramangala buyer)",
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
            PlatformConfig(key="supported_markets", value="US,IN", category="general"),
        ]
        db.add_all(config_entries)
        await db.commit()

        us_props = sum(1 for p in properties if p.country == "US")
        in_props = sum(1 for p in properties if p.country == "IN")
        us_clients = sum(
            1 for c in clients if c.tenant_id in {tenants[i].id for i in (0, 1, 2, 3)}
        )
        in_clients = len(clients) - us_clients
        logger.info(
            "Seed complete: {} tenants, {} clients ({} US / {} IN), {} properties ({} US / {} IN), {} listings, {} showings, {} leads",
            len(tenants),
            len(clients),
            us_clients,
            in_clients,
            len(properties),
            us_props,
            in_props,
            len(listings),
            len(showings),
            len(leads),
        )


async def main() -> None:
    try:
        await seed_database()
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
