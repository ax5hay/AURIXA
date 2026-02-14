import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from loguru import logger
import numpy as np

from .models import RetrieveRequest, RetrieveResponse, DocumentSnippet
from .documents import load_documents_from_db

MODEL_NAME = "all-MiniLM-L6-v2"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load ML models and build the search index. Graceful degradation on failure."""
    logger.info("RAG service starting up")
    app.state.model = None
    app.state.index = None
    app.state.documents = {}
    app.state.doc_sources = []

    try:
        from sentence_transformers import SentenceTransformer
        import faiss

        logger.info("Loading sentence-transformer model: {}", MODEL_NAME)
        model = SentenceTransformer(MODEL_NAME)
        app.state.model = model

        documents = await load_documents_from_db(tenant_id=None)
        app.state.documents = documents
        logger.info("Loaded {} documents from knowledge base", len(documents))

        if documents:
            logger.info("Encoding {} documents for the FAISS index...", len(documents))
            doc_contents = list(documents.values())
            embeddings = model.encode(doc_contents, convert_to_tensor=False)
            index = faiss.IndexFlatL2(embeddings.shape[1])
            index.add(embeddings)
            app.state.index = index
            app.state.doc_sources = list(documents.keys())
            logger.info("FAISS index built successfully with {} vectors.", index.ntotal)
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

        distances, indices = app.state.index.search(query_embedding, k)
        retrieved_snippets = []
        for i in range(k):
            idx = int(indices[0][i])
            if idx < 0 or idx >= len(app.state.doc_sources):
                continue
            source = app.state.doc_sources[idx]
            content = app.state.documents.get(source, "")
            dist = float(distances[0][i])
            score = max(0, 1 - dist)
            retrieved_snippets.append(
                DocumentSnippet(
                    source=source,
                    content=content,
                    score=round(score, 4),
                    metadata={"retrieval_method": "vector_search", "engine": "faiss"},
                )
            )

        elapsed_ms = round((time.perf_counter() - t0) * 1000)
        logger.info("Retrieved {} snippets in {}ms", len(retrieved_snippets), elapsed_ms)
        return RetrieveResponse(snippets=retrieved_snippets, metadata={"query_time_ms": elapsed_ms})
    except Exception as e:
        logger.error("Retrieval failed: {}", e)
        raise HTTPException(status_code=500, detail=f"Retrieval failed: {e}")
