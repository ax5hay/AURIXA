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

# Fallback docs when DB unavailable or empty
FALLBACK_DOCUMENTS = {
    "aurixa-overview.txt": "AURIXA is a real-time conversational AI orchestration and automation SaaS platform for healthcare.",
    "services.txt": "The platform includes an API Gateway, Orchestration Engine, LLM Router, RAG Service, and Safety Guardrails.",
    "features.txt": "Key features include voice interaction, agentic workflows, real-time observability, and multi-tenant support.",
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
