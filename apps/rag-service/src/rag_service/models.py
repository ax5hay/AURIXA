"""Pydantic models for the RAG Service."""

from pydantic import BaseModel, Field
from typing import List, Dict, Any

class DocumentSnippet(BaseModel):
    """Represents a snippet of a retrieved document."""
    source: str = Field(description="The source of the document (e.g., file name, URL).")
    content: str = Field(description="The actual text content of the snippet.")
    score: float = Field(description="The relevance score of the snippet.", default=0.0)
    metadata: Dict[str, Any] = Field(description="Additional metadata about the snippet.", default_factory=dict)

class EmbedRequest(BaseModel):
    """Request for embedding one or more texts."""
    text: str = Field(description="Text to embed.", default="")


class RetrieveRequest(BaseModel):
    """Request to the RAG service to retrieve context."""
    prompt: str
    intent: Dict[str, Any] = Field(description="The intent classification from the LLM Router.", default_factory=dict)
    top_k: int = Field(description="The number of snippets to retrieve.", default=5)

class RetrieveResponse(BaseModel):
    """Response from the RAG service."""
    snippets: List[DocumentSnippet] = Field(description="The list of retrieved document snippets.")
    metadata: Dict[str, Any] = Field(description="Additional metadata about the retrieval process.", default_factory=dict)
