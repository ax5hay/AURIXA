"""Pydantic models for the Safety Guardrails service."""

from pydantic import BaseModel, Field
from typing import List, Dict, Any

class ValidationIssue(BaseModel):
    """Represents a single issue found during validation."""
    policy_name: str = Field(description="The name of the policy that was violated.")
    risk_category: str = Field(description="The category of the risk (e.g., 'profanity', 'pii').")
    severity: float = Field(description="The severity of the issue (0.0 to 1.0).")
    details: str = Field(description="Details about the validation issue.")

class ValidateRequest(BaseModel):
    """Request to the safety guardrails service to validate text."""
    text: str
    metadata: Dict[str, Any] = Field(description="Additional metadata for context.", default_factory=dict)

class ValidateResponse(BaseModel):
    """Response from the safety guardrails service."""
    is_safe: bool = Field(description="Whether the text is considered safe.")
    validated_text: str = Field(description="The original or a sanitized version of the text.")
    issues: List[ValidationIssue] = Field(description="A list of issues found, if any.", default_factory=list)
