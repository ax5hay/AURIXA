import asyncio
import os
import re
import time
from contextlib import asynccontextmanager
import httpx
from fastapi import FastAPI, HTTPException
from loguru import logger
import numpy as np

from .models import EmbedRequest, RetrieveRequest, RetrieveResponse, DocumentSnippet
from .documents import load_documents_from_db

MODEL_NAME = "all-MiniLM-L6-v2"
OBSERVABILITY_URL = os.getenv("OBSERVABILITY_CORE_HOST", "http://localhost:8008")
KEYWORD_BOOST = 0.15  # Boost score when query terms appear in document
RRF_K = 60  # Reciprocal Rank Fusion constant (higher = less rank dominance)


def _tokenize(text: str) -> list[str]:
    """Simple tokenizer: lowercase, split on non-alphanumeric, filter short tokens."""
    tokens = re.findall(r"\w{2,}", (text or "").lower())
    return tokens


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load ML models and build the search index. Graceful degradation on failure."""
    logger.info("RAG service starting up")
    app.state.model = None
    app.state.index = None
    app.state.bm25 = None
    app.state.documents = {}
    app.state.doc_sources = []

    try:
        from sentence_transformers import SentenceTransformer
        import faiss
        from rank_bm25 import BM25Okapi

        logger.info("Loading sentence-transformer model: {}", MODEL_NAME)
        model = SentenceTransformer(MODEL_NAME)
        app.state.model = model

        documents = await load_documents_from_db(tenant_id=None)
        app.state.documents = documents
        app.state.doc_sources = list(documents.keys())
        logger.info("Loaded {} documents from knowledge base", len(documents))

        if documents:
            doc_contents = list(documents.values())
            # Vector index
            logger.info("Encoding {} documents for the FAISS index...", len(documents))
            embeddings = model.encode(doc_contents, convert_to_tensor=False)
            index = faiss.IndexFlatL2(embeddings.shape[1])
            index.add(embeddings)
            app.state.index = index
            # BM25 index for hybrid retrieval
            tokenized_corpus = [_tokenize(c) for c in doc_contents]
            app.state.bm25 = BM25Okapi(tokenized_corpus)
            logger.info("FAISS + BM25 indexes built successfully ({} vectors).", index.ntotal)
        else:
            logger.warning("No documents loaded; running in fallback mode")
    except Exception as e:
        logger.error("RAG init failed (fallback mode): {}", e)

    yield
    logger.info("RAG service shutting down")


app = FastAPI(
    title="AURIXA RAG Service",
    version="0.1.0",
    lifespan=lifespan,
    description="Service for hybrid retrieval of knowledge from vector and text indexes.",
)


@app.post("/api/v1/embed", summary="Get embedding vector for text")
async def embed(request: EmbedRequest):
    """Returns embedding vector for use in semantic routing or similarity."""
    if app.state.model is None:
        raise HTTPException(status_code=503, detail="Embedding model not ready")
    text = request.text or ""
    vec = app.state.model.encode([text], convert_to_tensor=False)
    return {"embedding": vec[0].tolist(), "dims": len(vec[0])}


@app.get("/health", summary="Health check endpoint")
async def health():
    """Return a 200 OK status if the service is healthy."""
    idx = getattr(app.state, "index", None)
    n = idx.ntotal if idx is not None else 0
    return {
        "service": "rag-service",
        "status": "healthy",
        "model": MODEL_NAME,
        "indexed_docs": n,
        "ready": app.state.model is not None and idx is not None,
    }


@app.post("/api/v1/retrieve", response_model=RetrieveResponse, summary="Retrieve document snippets for a prompt")
async def retrieve(request: RetrieveRequest):
    """Retrieves the most relevant document snippets using vector search."""
    t0 = time.perf_counter()
    logger.info("Received retrieval request for prompt: '{}'", request.prompt[:80])

    if app.state.model is None or app.state.index is None:
        logger.warning("RAG not fully initialized; returning empty results")
        return RetrieveResponse(
            snippets=[],
            metadata={"query_time_ms": 0, "fallback": True, "reason": "Index not ready"},
        )

    try:
        query_embedding = app.state.model.encode([request.prompt])
        ntotal = app.state.index.ntotal
        k = min(request.top_k, ntotal) if ntotal > 0 else 0

        if k == 0:
            return RetrieveResponse(
                snippets=[],
                metadata={"query_time_ms": round((time.perf_counter() - t0) * 1000), "index_empty": True},
            )

        use_hybrid = (
            os.getenv("RAG_USE_HYBRID", "true").lower() == "true"
            and getattr(app.state, "bm25", None) is not None
        )

        # Vector search
        distances, indices = app.state.index.search(query_embedding, k)
        rrf_scores: dict[str, float] = {}
        for rank, idx in enumerate(indices[0]):
            idx = int(idx)
            if idx < 0 or idx >= len(app.state.doc_sources):
                continue
            source = app.state.doc_sources[idx]
            rrf_scores[source] = rrf_scores.get(source, 0) + 1 / (RRF_K + rank)

        # BM25 search (hybrid)
        if use_hybrid:
            query_tokens = _tokenize(request.prompt)
            if query_tokens:
                bm25_scores = app.state.bm25.get_scores(query_tokens)
                top_bm25 = np.argsort(bm25_scores)[::-1][:k]
                for rank, idx in enumerate(top_bm25):
                    if bm25_scores[idx] <= 0:
                        continue
                    source = app.state.doc_sources[idx]
                    rrf_scores[source] = rrf_scores.get(source, 0) + 1 / (RRF_K + rank)

        # Build snippets from fused scores
        query_terms = set(_tokenize(request.prompt)) - {"a", "an", "the", "is", "are", "to", "i", "me", "my", "how", "what", "when", "where", "do", "does", "can", "tell"}
        retrieved_snippets = []
        for source, rrf in sorted(rrf_scores.items(), key=lambda x: -x[1])[:k]:
            content = app.state.documents.get(source, "")
            content_lower = content.lower()
            matches = sum(1 for t in query_terms if t in content_lower)
            # Normalize RRF to 0-1 and add keyword boost
            score = min(1.0, rrf + KEYWORD_BOOST * min(matches, 5))
            retrieved_snippets.append(
                DocumentSnippet(
                    source=source,
                    content=content,
                    score=round(score, 4),
                    metadata={
                        "retrieval_method": "hybrid" if use_hybrid else "vector",
                        "engine": "faiss+bm25" if use_hybrid else "faiss",
                        "keyword_matches": matches,
                    },
                )
            )
        retrieved_snippets.sort(key=lambda s: s.score, reverse=True)

        elapsed_ms = round((time.perf_counter() - t0) * 1000)
        logger.info("Retrieved {} snippets in {}ms", len(retrieved_snippets), elapsed_ms)
        # Fire-and-forget telemetry
        if OBSERVABILITY_URL:
            async def _emit():
                try:
                    async with httpx.AsyncClient(timeout=2.0) as client:
                        await client.post(
                            f"{OBSERVABILITY_URL}/api/v1/telemetry",
                            json={
                                "service_name": "rag-service",
                                "event_type": "api_call",
                                "data": {
                                    "latency_ms": elapsed_ms,
                                    "snippet_count": len(retrieved_snippets),
                                    "hybrid": use_hybrid,
                                },
                            },
                        )
                except Exception:
                    pass
            asyncio.create_task(_emit())

        return RetrieveResponse(
            snippets=retrieved_snippets,
            metadata={
                "query_time_ms": elapsed_ms,
                "hybrid": use_hybrid,
            },
        )
    except Exception as e:
        logger.error("Retrieval failed: {}", e)
        raise HTTPException(status_code=500, detail=f"Retrieval failed: {e}")
