from contextlib import asynccontextmanager
import numpy as np
from fastapi import FastAPI
from loguru import logger
from sentence_transformers import SentenceTransformer
import faiss

from .models import RetrieveRequest, RetrieveResponse, DocumentSnippet

MODEL_NAME = "all-MiniLM-L6-v2"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load ML models and build the search index on startup."""
    logger.info("RAG service starting up")
    
    # 1. Load the sentence-transformer model
    logger.info("Loading sentence-transformer model: {}", MODEL_NAME)
    model = SentenceTransformer(MODEL_NAME)
    app.state.model = model
    
    # 2. Create a mock document store
    documents = {
        "aurixa-overview.txt": "AURIXA is a real-time conversational AI orchestration and automation SaaS platform.",
        "services.txt": "The platform is composed of several microservices, including an API Gateway, Orchestration Engine, and LLM Router.",
        "features.txt": "Key features include voice interaction, agentic workflows, and real-time observability.",
        "tech-stack.txt": "The backend is primarily built with Python (FastAPI) and TypeScript (Fastify), running on Kubernetes."
    }
    app.state.documents = documents
    
    # 3. Encode documents and build FAISS index
    logger.info("Encoding {} documents for the FAISS index...", len(documents))
    doc_contents = list(documents.values())
    embeddings = model.encode(doc_contents, convert_to_tensor=False)
    
    index = faiss.IndexFlatL2(embeddings.shape[1])
    index.add(embeddings)
    app.state.index = index
    app.state.doc_sources = list(documents.keys())
    
    logger.info("FAISS index built successfully with {} vectors.", index.ntotal)
    
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
    return {"service": "rag-service", "status": "healthy", "model": MODEL_NAME, "indexed_docs": app.state.index.ntotal}


@app.post("/api/v1/retrieve", response_model=RetrieveResponse, summary="Retrieve document snippets for a prompt")
async def retrieve(request: RetrieveRequest):
    """
    Retrieves the most relevant document snippets for a given prompt using vector search.
    """
    logger.info("Received retrieval request for prompt: '{}'", request.prompt)
    
    # 1. Embed the query
    query_embedding = app.state.model.encode([request.prompt])
    
    # 2. Search the FAISS index
    k = min(request.top_k, app.state.index.ntotal)
    distances, indices = app.state.index.search(query_embedding, k)
    
    # 3. Format the response
    retrieved_snippets = []
    for i in range(k):
        index = indices[0][i]
        source = app.state.doc_sources[index]
        content = app.state.documents[source]
        score = 1 - distances[0][i] # Normalize L2 distance to a similarity score
        
        retrieved_snippets.append(
            DocumentSnippet(
                source=source,
                content=content,
                score=score,
                metadata={"retrieval_method": "vector_search", "engine": "faiss"}
            )
        )
        
    logger.info("Retrieved {} snippets for prompt", len(retrieved_snippets))

    return RetrieveResponse(
        snippets=retrieved_snippets,
        metadata={"query_time_ms": 50} # Placeholder latency
    )
