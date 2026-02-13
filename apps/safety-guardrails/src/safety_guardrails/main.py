from contextlib import asynccontextmanager
from fastapi import FastAPI
from loguru import logger

from .models import ValidateRequest, ValidateResponse, ValidationIssue

# A real implementation would use a sophisticated, configurable policy engine.
BANNED_WORDS = {"unsafe", "exploit", "vulnerability"}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Log service startup and shutdown."""
    logger.info("Safety Guardrails service starting up")
    yield
    logger.info("Safety Guardrails service shutting down")


app = FastAPI(
    title="AURIXA Safety Guardrails",
    version="0.1.0",
    lifespan=lifespan,
    description="Service for enforcing safety policies on LLM inputs and outputs.",
)


@app.get("/health", summary="Health check endpoint")
async def health():
    """Return a 200 OK status if the service is healthy."""
    return {"service": "safety-guardrails", "status": "healthy"}


@app.post("/api/v1/validate", response_model=ValidateResponse, summary="Validate text against safety policies")
async def validate(request: ValidateRequest):
    """
    Validates a given string of text against configured safety policies.

    This is a simplified mock implementation. A real implementation would:
    1.  Run the text through a series of classifiers (e.g., for toxicity, PII, prompt injection).
    2.  Check against configurable regex or keyword-based policies.
    3.  Optionally sanitize the text instead of rejecting it outright.
    """
    logger.info("Received validation request")
    
    text_lower = request.text.lower()
    found_issues = []

    for word in BANNED_WORDS:
        if word in text_lower:
            issue = ValidationIssue(
                policy_name="banned_word_policy",
                risk_category="profanity",
                severity=0.9,
                details=f"The word '{word}' is not allowed."
            )
            found_issues.append(issue)
            
    if found_issues:
        logger.warning("Validation failed for text: '{}'", request.text)
        return ValidateResponse(
            is_safe=False,
            validated_text="[Content Redacted]",
            issues=found_issues
        )

    logger.success("Validation passed for text: '{}'", request.text)
    return ValidateResponse(
        is_safe=True,
        validated_text=request.text,
        issues=[]
    )
