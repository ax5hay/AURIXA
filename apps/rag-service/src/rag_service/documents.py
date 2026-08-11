"""Document loading from DB or fallback - modular for pluggable sources."""

from __future__ import annotations

from loguru import logger

try:
    from aurixa_db import AsyncSessionLocal
    from aurixa_db.models import KnowledgeBaseArticle
    from sqlalchemy import select
    DB_AVAILABLE = True
except ImportError:
    DB_AVAILABLE = False
    AsyncSessionLocal = None

# Fallback docs when DB unavailable or empty - real estate focused
FALLBACK_DOCUMENTS = {
    "aurixa-overview.txt": (
        "AURIXA is a real-time conversational AI orchestration platform for real estate "
        "brokerages, property managers, and developers."
    ),
    "office-hours.txt": (
        "Our office hours are Monday through Friday 9:00 AM to 6:00 PM, and Saturday 10:00 AM to 2:00 PM. "
        "We are closed on Sundays and major holidays. For urgent property emergencies after hours, "
        "call the on-call maintenance line listed in your lease or portal."
    ),
    "scheduling-showings.txt": (
        "To schedule a property showing: use the client portal, ask the assistant for available times, "
        "or contact your agent directly. Same-day tours may be available for active listings. "
        "Please cancel or reschedule at least 24 hours in advance."
    ),
    "buyer-process.txt": (
        "The buyer journey typically includes pre-approval, showings, offer submission, inspection, "
        "appraisal, and closing. Your agent will guide each step and coordinate with the title company."
    ),
    "fair-housing.txt": (
        "We comply with fair housing laws and do not discriminate based on race, color, religion, sex, "
        "disability, familial status, or national origin. We cannot honor requests to filter listings "
        "or tenants by protected characteristics."
    ),
    "rental-application.txt": (
        "Rental applications require photo ID, proof of income, and references. Application and "
        "background-check fees may apply. Processing typically takes 2–3 business days after documents "
        "are received."
    ),
    "financing-overview.txt": (
        "Mortgage pre-approval helps you understand budget and strengthens offers. We can connect you "
        "with preferred lenders. AURIXA does not provide legal or tax advice—consult licensed professionals."
    ),
    "services.txt": (
        "The platform includes an API Gateway, Orchestration Engine, LLM Router, RAG Service, "
        "Agent Runtime, Execution Engine, and Safety Guardrails."
    ),
}


async def load_documents_from_db(tenant_id: int | None = None) -> dict[str, str]:
    """Load KnowledgeBaseArticle from DB. Returns dict of source -> content."""
    if not DB_AVAILABLE or not AsyncSessionLocal:
        return FALLBACK_DOCUMENTS

    try:
        async with AsyncSessionLocal() as session:
            q = select(KnowledgeBaseArticle)
            if tenant_id is not None:
                q = q.where(KnowledgeBaseArticle.tenant_id == tenant_id)
            result = await session.execute(q)
            articles = result.scalars().all()
            docs = {}
            for a in articles:
                key = f"kb-{a.id}-{a.title.replace(' ', '-')[:30]}.txt"
                docs[key] = f"{a.title}\n\n{a.content}"
            return docs if docs else FALLBACK_DOCUMENTS
    except Exception as e:
        logger.warning("Could not load documents from DB: {}", e)
        return FALLBACK_DOCUMENTS
