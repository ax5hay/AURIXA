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

# Fallback docs when DB unavailable or empty - healthcare-focused for sample prompts
FALLBACK_DOCUMENTS = {
    "aurixa-overview.txt": "AURIXA is a real-time conversational AI orchestration and automation SaaS platform for healthcare.",
    "operating-hours.txt": (
        "Our office operating hours are Monday through Friday 8:00 AM to 6:00 PM, and Saturday 9:00 AM to 1:00 PM. "
        "We are closed on Sundays and major holidays. For urgent matters outside these hours, please call our 24/7 nurse line."
    ),
    "prescription-refill.txt": (
        "To request a prescription refill, you can: 1) Use the patient portal and submit a refill request under Medications, "
        "2) Call our pharmacy line at (555) 123-4567, or 3) Ask your provider during an appointment. "
        "Allow 24-48 hours for processing. Controlled substances may require an office visit."
    ),
    "billing-insurance.txt": (
        "We accept most major insurance plans including Aetna, UnitedHealthcare, Blue Cross Blue Shield, and Medicare. "
        "Co-pays are due at the time of service. For billing questions, call (555) 987-6543 or log into the patient portal. "
        "Payment plans are available for balances over $100."
    ),
    "appointments.txt": (
        "To schedule an appointment: use the patient portal, call (555) 111-2222, or request via the mobile app. "
        "Same-day appointments may be available for urgent issues. Please arrive 15 minutes early for new patient visits. "
        "Cancel or reschedule at least 24 hours in advance to avoid a no-show fee."
    ),
    "services.txt": "The platform includes an API Gateway, Orchestration Engine, LLM Router, RAG Service, and Safety Guardrails.",
    "tech-stack.txt": "Built with Python (FastAPI), TypeScript (Fastify), Next.js, PostgreSQL, and Redis.",
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
            for i, a in enumerate(articles):
                key = f"kb-{a.id}-{a.title.replace(' ', '-')[:30]}.txt"
                docs[key] = f"{a.title}\n\n{a.content}"
            return docs if docs else FALLBACK_DOCUMENTS
    except Exception as e:
        logger.warning("Could not load documents from DB: {}", e)
        return FALLBACK_DOCUMENTS
