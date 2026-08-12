"""Procedurally generated seed records (Faker + random), ~60% US / ~40% IN."""

from __future__ import annotations

import datetime
import os
import random
import uuid
from typing import Any

from faker import Faker
from sqlalchemy.ext.asyncio import AsyncSession

from aurixa_db.models import Client, Lead, Listing, Property, Showing

DEFAULT_RANDOM_SEED = int(os.getenv("SEED_RANDOM_SEED", "42"))
TARGET_CLIENT_TOTAL = int(os.getenv("SEED_CLIENT_COUNT", "1000"))
BATCH_SIZE = int(os.getenv("SEED_BATCH_SIZE", "200"))

US_TENANT_INDICES = (0, 1, 2, 3)
IN_TENANT_INDICES = (4, 5)
US_BROKERAGE_INDICES = (0, 3)
US_PM_INDICES = (1,)
US_DEVELOPER_INDICES = (2,)

US_CITIES: list[tuple[str, str, str]] = [
    ("Portland", "OR", "972"),
    ("Austin", "TX", "787"),
    ("Seattle", "WA", "981"),
    ("Denver", "CO", "802"),
    ("Charlotte", "NC", "282"),
    ("Phoenix", "AZ", "850"),
    ("Nashville", "TN", "372"),
    ("Raleigh", "NC", "276"),
    ("San Diego", "CA", "921"),
    ("Minneapolis", "MN", "554"),
]

IN_CITIES: list[tuple[str, str, str]] = [
    ("Bengaluru", "KA", "560"),
    ("Mumbai", "MH", "400"),
    ("Pune", "MH", "411"),
    ("Hyderabad", "TS", "500"),
    ("Gurugram", "HR", "122"),
    ("Chennai", "TN", "600"),
    ("Noida", "UP", "201"),
    ("Ahmedabad", "GJ", "380"),
]

US_AREAS = [
    "Downtown",
    "Westside",
    "Suburbs",
    "East Austin",
    "Capitol Hill",
    "LoDo",
    "RiNo",
    "Uptown",
    "Midtown",
    "Lakefront",
    "Old Town",
    "Arts District",
]

IN_AREAS = [
    "Koramangala",
    "Whitefield",
    "HSR Layout",
    "Indiranagar",
    "Bandra West",
    "Powai",
    "Andheri East",
    "Golf Course Road",
    "Hitech City",
    "Koregaon Park",
    "Jubilee Hills",
    "Sector 57",
]

US_LEAD_SOURCES = ["website", "zillow", "realtor.com", "open_house", "referral", "facebook"]
IN_LEAD_SOURCES = ["99acres", "magicbricks", "housing.com", "nobroker", "referral", "walk_in"]
US_RESIDENTIAL_STAGES = [
    "new",
    "contacted",
    "qualified",
    "showing_scheduled",
    "showing_completed",
    "offer_submitted",
]
IN_RESIDENTIAL_STAGES = US_RESIDENTIAL_STAGES
PM_STAGES = ["inquiry", "tour_scheduled", "tour_completed", "application_started", "application_submitted"]

PROPERTY_TYPES_US = ["single_family", "townhouse", "condo", "apartment"]
PROPERTY_TYPES_IN = ["apartment", "villa", "single_family", "townhouse"]

SHOWING_STATUSES = ["confirmed"] * 4 + ["completed"] * 3 + ["cancelled"] + ["no_show"]
SHOWING_TYPES = ["private_tour"] * 7 + ["open_house"] * 2 + ["virtual"]


def _rng(seed: int) -> tuple[Faker, Faker, random.Random]:
    Faker.seed(seed)
    us = Faker("en_US")
    india = Faker("en_IN")
    py_random = random.Random(seed)
    return us, india, py_random


def _us_phone(faker: Faker, py_random: random.Random) -> str:
    return f"+1-{py_random.randint(200, 989)}-{py_random.randint(200, 999)}-{py_random.randint(1000, 9999)}"


def _in_phone(faker: Faker, py_random: random.Random) -> str:
    return f"+91-{py_random.randint(70, 99)}{py_random.randint(100, 999)}-{py_random.randint(10000, 99999)}"


def _unique_email(base: str, domain: str, used: set[str]) -> str:
    candidate = base
    counter = 0
    while candidate in used:
        counter += 1
        candidate = f"{base.split('@')[0]}+{counter}@{domain}"
    used.add(candidate)
    return candidate


def _pick_us_tenant(py_random: random.Random, client_type: str) -> int:
    if client_type == "renter":
        return py_random.choice([*US_PM_INDICES, 0])
    if client_type == "seller":
        return py_random.choice(US_BROKERAGE_INDICES)
    roll = py_random.random()
    if roll < 0.55:
        return py_random.choice(US_BROKERAGE_INDICES)
    if roll < 0.75:
        return py_random.choice(US_PM_INDICES)
    return py_random.choice(US_DEVELOPER_INDICES)


def _pick_in_tenant(py_random: random.Random, client_type: str) -> int:
    if client_type == "renter":
        return 5
    return 4 if py_random.random() < 0.65 else 5


def _client_preferences(country: str, py_random: random.Random) -> dict[str, Any] | None:
    if py_random.random() < 0.25:
        return None
    areas = py_random.sample(US_AREAS if country == "US" else IN_AREAS, k=py_random.randint(1, 3))
    prefs: dict[str, Any] = {
        "areas": areas,
        "beds_min": py_random.randint(1, 4),
    }
    if country == "US":
        prefs["budget_max"] = py_random.randint(280_000, 1_450_000)
    else:
        prefs["budget_max"] = py_random.randint(4_500_000, 45_000_000)
    if py_random.random() < 0.3:
        prefs["pets"] = py_random.choice([True, False])
    return prefs


def generate_client_specs(
    count_us: int,
    count_in: int,
    seed: int = DEFAULT_RANDOM_SEED,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    us_faker, in_faker, py_random = _rng(seed)
    used_emails: set[str] = set()
    us_specs: list[dict[str, Any]] = []
    in_specs: list[dict[str, Any]] = []

    for _ in range(count_us):
        client_type = py_random.choices(
            ["buyer", "renter", "seller"],
            weights=[62, 28, 10],
            k=1,
        )[0]
        full_name = us_faker.name()
        slug = full_name.lower().replace(" ", ".")
        email = _unique_email(f"{slug}@example.com", "example.com", used_emails)
        us_specs.append(
            {
                "full_name": full_name,
                "email": email,
                "phone_number": _us_phone(us_faker, py_random),
                "client_type": client_type,
                "tenant_index": _pick_us_tenant(py_random, client_type),
                "preferences": _client_preferences("US", py_random),
            }
        )

    for _ in range(count_in):
        client_type = py_random.choices(
            ["buyer", "renter", "seller"],
            weights=[58, 34, 8],
            k=1,
        )[0]
        full_name = in_faker.name()
        slug = full_name.lower().replace(" ", ".").replace("'", "")
        email = _unique_email(f"{slug}@gmail.com", "gmail.com", used_emails)
        in_specs.append(
            {
                "full_name": full_name,
                "email": email,
                "phone_number": _in_phone(in_faker, py_random),
                "client_type": client_type,
                "tenant_index": _pick_in_tenant(py_random, client_type),
                "preferences": _client_preferences("IN", py_random),
            }
        )

    return us_specs, in_specs


def generate_property_specs(
    count_us: int,
    count_in: int,
    seed: int = DEFAULT_RANDOM_SEED,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    _, _, py_random = _rng(seed + 1)
    us_specs: list[dict[str, Any]] = []
    in_specs: list[dict[str, Any]] = []

    for _ in range(count_us):
        city, state, zip_prefix = py_random.choice(US_CITIES)
        tenant_index = py_random.choice(US_TENANT_INDICES)
        beds = py_random.randint(1, 5)
        us_specs.append(
            {
                "tenant_index": tenant_index,
                "address_line1": f"{py_random.randint(100, 9899)} {py_random.choice(['Oak', 'Maple', 'Cedar', 'Pine', 'Lake', 'River', 'Park', 'Hill'])} {py_random.choice(['St', 'Ave', 'Blvd', 'Dr', 'Ln'])}",
                "city": city,
                "state": state,
                "postal_code": f"{zip_prefix}{py_random.randint(10, 99)}",
                "property_type": py_random.choice(PROPERTY_TYPES_US),
                "beds": beds,
                "baths": py_random.choice([1.0, 1.5, 2.0, 2.5, 3.0, 3.5]),
                "sqft": py_random.randint(650, 3400),
                "year_built": py_random.randint(1975, 2025),
            }
        )

    for _ in range(count_in):
        city, state, pin_prefix = py_random.choice(IN_CITIES)
        tenant_index = py_random.choice(IN_TENANT_INDICES)
        beds = py_random.randint(1, 4)
        in_specs.append(
            {
                "tenant_index": tenant_index,
                "address_line1": f"{py_random.randint(1, 999)}, {py_random.choice(['MG Road', 'Main Road', 'Cross', 'Layout', 'Sector', 'Enclave', 'Heights'])}",
                "city": city,
                "state": state,
                "postal_code": f"{pin_prefix}{py_random.randint(100, 999)}",
                "property_type": py_random.choice(PROPERTY_TYPES_IN),
                "beds": beds,
                "baths": py_random.choice([1.0, 2.0, 2.5, 3.0, 3.5, 4.0]),
                "sqft": py_random.randint(550, 3200),
                "year_built": py_random.randint(1995, 2025),
            }
        )

    return us_specs, in_specs


def generate_listing_specs_for_indices(
    property_meta: list[tuple[int, int, str]],
    seed: int = DEFAULT_RANDOM_SEED,
) -> list[dict[str, Any]]:
    """Build one listing spec per (property_index, tenant_index, country)."""
    _, _, py_random = _rng(seed + 2)
    specs: list[dict[str, Any]] = []

    for prop_index, tenant_index, country in property_meta:
        is_rent = tenant_index in US_PM_INDICES or tenant_index == 5
        if tenant_index in US_BROKERAGE_INDICES or tenant_index == 4:
            is_rent = py_random.random() < 0.22
        elif tenant_index in US_PM_INDICES or tenant_index == 5:
            is_rent = py_random.random() < 0.78

        beds = py_random.randint(1, 4)
        if is_rent:
            if country == "US":
                rent = py_random.randint(1200, 5200)
                title = f"{beds}BR rental in {py_random.choice(US_AREAS)}"
            else:
                rent = py_random.randint(18000, 175000)
                title = f"{beds}BHK for rent — {py_random.choice(IN_AREAS)}"
            specs.append(
                {
                    "property_index": prop_index,
                    "tenant_index": tenant_index,
                    "listing_type": "rent",
                    "status": py_random.choices(["active", "pending", "draft"], weights=[88, 8, 4], k=1)[0],
                    "rent_amount": rent,
                    "marketing_title": title,
                    "marketing_description": Faker("en_US").paragraph(nb_sentences=2)[:220],
                    "days_published": py_random.randint(1, 45),
                }
            )
        else:
            if country == "US":
                price = py_random.randint(265_000, 1_650_000)
                title = f"{beds}BR {py_random.choice(['home', 'townhouse', 'condo', 'craftsman'])} — {py_random.choice(US_AREAS)}"
            else:
                price = py_random.randint(3_800_000, 48_000_000)
                title = f"{beds}BHK {py_random.choice(['apartment', 'villa', 'flat'])} — {py_random.choice(IN_AREAS)}"
            specs.append(
                {
                    "property_index": prop_index,
                    "tenant_index": tenant_index,
                    "listing_type": "sale",
                    "status": py_random.choices(["active", "pending", "draft"], weights=[85, 10, 5], k=1)[0],
                    "list_price": price,
                    "marketing_title": title,
                    "marketing_description": (
                        ("RERA registered. " if country == "IN" else "")
                        + Faker("en_US").paragraph(nb_sentences=2)[:200]
                    ),
                    "days_published": py_random.randint(1, 60),
                }
            )

    return specs


def generate_listing_specs(
    property_count: int,
    property_offset: int,
    seed: int = DEFAULT_RANDOM_SEED,
) -> list[dict[str, Any]]:
    """Legacy helper — assumes US/IN tenant indices from property index parity."""
    _, _, py_random = _rng(seed + 2)
    meta = [
        (idx, py_random.choice(US_TENANT_INDICES + IN_TENANT_INDICES), "US")
        for idx in range(property_offset, property_count)
    ]
    return generate_listing_specs_for_indices(meta, seed)


def generate_showing_specs(
    client_count: int,
    listing_count: int,
    staff_count: int,
    count: int,
    seed: int = DEFAULT_RANDOM_SEED,
) -> list[dict[str, Any]]:
    _, _, py_random = _rng(seed + 3)
    specs: list[dict[str, Any]] = []
    curated_client_cutoff = min(20, client_count)

    for _ in range(count):
        # Bias toward random clients but keep some on curated ids 1-20
        if py_random.random() < 0.12 and curated_client_cutoff > 0:
            client_index = py_random.randint(0, curated_client_cutoff - 1)
        else:
            client_index = py_random.randint(curated_client_cutoff, max(curated_client_cutoff, client_count - 1))

        listing_index = py_random.randint(0, max(0, listing_count - 1))
        staff_index = py_random.randint(0, max(0, staff_count - 1))
        tenant_index = py_random.choice(US_TENANT_INDICES + IN_TENANT_INDICES)
        days_offset = py_random.randint(-14, 21)
        specs.append(
            {
                "client_index": client_index,
                "listing_index": listing_index,
                "staff_index": staff_index,
                "tenant_index": tenant_index,
                "days_offset": days_offset,
                "hour": py_random.randint(9, 18),
                "status": py_random.choice(SHOWING_STATUSES),
                "notes": py_random.choice(
                    [
                        "First-time buyer",
                        "Relocating family",
                        "Investor tour",
                        "Second visit",
                        "NRI video follow-up",
                        "Weekend open slot",
                        None,
                    ]
                ),
                "showing_type": py_random.choice(SHOWING_TYPES),
            }
        )

    return specs


def generate_lead_specs(
    client_count: int,
    listing_count: int,
    staff_count: int,
    count: int,
    seed: int = DEFAULT_RANDOM_SEED,
) -> list[dict[str, Any]]:
    us_faker, in_faker, py_random = _rng(seed + 4)
    specs: list[dict[str, Any]] = []
    used_emails: set[str] = set()

    for _ in range(count):
        country = "US" if py_random.random() < 0.6 else "IN"
        tenant_index = py_random.choice(US_TENANT_INDICES if country == "US" else IN_TENANT_INDICES)
        segment = "pm" if tenant_index in US_PM_INDICES or tenant_index == 5 else "residential"
        faker = us_faker if country == "US" else in_faker
        full_name = faker.name()
        domain = "example.com" if country == "US" else "gmail.com"
        slug = full_name.lower().replace(" ", ".").replace("'", "")
        email = _unique_email(f"{slug}@{domain}", domain, used_emails)
        link_client = py_random.random() < 0.55
        client_index = py_random.randint(0, client_count - 1) if link_client and client_count else None
        specs.append(
            {
                "tenant_index": tenant_index,
                "client_index": client_index,
                "listing_index": py_random.randint(0, max(0, listing_count - 1)),
                "staff_index": py_random.randint(0, max(0, staff_count - 1)),
                "full_name": full_name,
                "email": email,
                "phone_number": _us_phone(us_faker, py_random)
                if country == "US"
                else _in_phone(in_faker, py_random),
                "source": py_random.choice(US_LEAD_SOURCES if country == "US" else IN_LEAD_SOURCES),
                "stage": py_random.choice(PM_STAGES if segment == "pm" else US_RESIDENTIAL_STAGES),
                "segment": segment,
            }
        )

    return specs


async def bulk_insert_clients(
    db: AsyncSession,
    specs: list[dict[str, Any]],
    tenants: list[Any],
    batch_size: int = BATCH_SIZE,
) -> list[Client]:
    created: list[Client] = []
    for start in range(0, len(specs), batch_size):
        batch = specs[start : start + batch_size]
        rows = [
            Client(
                full_name=spec["full_name"],
                email=spec.get("email"),
                phone_number=spec.get("phone_number"),
                client_type=spec.get("client_type", "buyer"),
                tenant_id=tenants[spec["tenant_index"]].id,
                preferences=spec.get("preferences"),
            )
            for spec in batch
        ]
        db.add_all(rows)
        await db.commit()
        for row in rows:
            await db.refresh(row)
        created.extend(rows)
    return created


async def bulk_insert_properties(
    db: AsyncSession,
    us_specs: list[dict[str, Any]],
    in_specs: list[dict[str, Any]],
    tenants: list[Any],
    batch_size: int = BATCH_SIZE,
) -> list[Property]:
    created: list[Property] = []
    all_specs = [(s, "US") for s in us_specs] + [(s, "IN") for s in in_specs]
    for start in range(0, len(all_specs), batch_size):
        batch = all_specs[start : start + batch_size]
        rows = [
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
            for spec, country in batch
        ]
        db.add_all(rows)
        await db.commit()
        for row in rows:
            await db.refresh(row)
        created.extend(rows)
    return created


async def bulk_insert_listings(
    db: AsyncSession,
    specs: list[dict[str, Any]],
    tenants: list[Any],
    properties: list[Property],
    now: datetime.datetime,
    batch_size: int = BATCH_SIZE,
) -> list[Listing]:
    created: list[Listing] = []
    for start in range(0, len(specs), batch_size):
        batch = specs[start : start + batch_size]
        rows = [
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
            for spec in batch
        ]
        db.add_all(rows)
        await db.commit()
        for row in rows:
            await db.refresh(row)
        created.extend(rows)
    return created


def compute_random_counts(
    curated_clients: int,
    curated_properties: int,
    target_clients: int = TARGET_CLIENT_TOTAL,
) -> dict[str, int]:
    remaining_clients = max(0, target_clients - curated_clients)
    random_us_clients = int(remaining_clients * 0.6)
    random_in_clients = remaining_clients - random_us_clients
    # ~15 extra properties per 100 clients beyond curated set
    extra_properties = max(0, int((target_clients - curated_clients) * 0.15))
    random_us_props = int(extra_properties * 0.6)
    random_in_props = extra_properties - random_us_props
    return {
        "random_us_clients": random_us_clients,
        "random_in_clients": random_in_clients,
        "random_us_properties": random_us_props,
        "random_in_properties": random_in_props,
        "random_showings": min(900, max(400, target_clients // 2)),
        "random_leads": min(600, max(250, target_clients // 3)),
    }


def random_session_id() -> str:
    return f"conv-{uuid.uuid4().hex[:12]}"
