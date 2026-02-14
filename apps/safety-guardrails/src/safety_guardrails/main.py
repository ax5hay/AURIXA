import os
import re
from contextlib import asynccontextmanager
from fastapi import FastAPI
from loguru import logger

from .models import ValidateRequest, ValidateResponse, ValidationIssue

# Configurable via env (comma-separated). Extend for production.
_BANNED = os.getenv("SAFETY_BANNED_WORDS", "unsafe,exploit,vulnerability,pii_leak")
BANNED_WORDS = {w.strip().lower() for w in _BANNED.split(",") if w.strip()}

# Emergency/clinical triage keywords - triggers escalation to human
_EMERGENCY = os.getenv(
    "SAFETY_EMERGENCY_KEYWORDS",
    "chest pain,stroke,bleeding heavily,difficulty breathing,suicide,thoughts of hurting myself,"
    "can't breathe,unconscious,severe allergic reaction,overdose,child not breathing,"
    "severe headache with confusion,sudden numbness,seizure,poisoning",
)
EMERGENCY_KEYWORDS = {w.strip().lower() for w in _EMERGENCY.split(",") if w.strip()}

# Simple PII patterns - redact in production
PII_PATTERNS = [
    (re.compile(r"\b\d{3}-\d{2}-\d{4}\b"), "SSN"),
    (re.compile(r"\b\d{16}\b"), "Credit card"),
    (re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"), "Email"),
    (re.compile(r"\b\d{10,}\b"), "Phone/ID"),
]


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
    """Validates text against banned words, PII, and emergency/clinical triage. Returns sanitized output."""
    text = request.text or ""
    text_lower = text.lower()
    found_issues = []
    validated_text = text
    requires_escalation = False

    # 0. Emergency / clinical triage - escalate to human immediately
    for phrase in EMERGENCY_KEYWORDS:
        if phrase in text_lower:
            found_issues.append(
                ValidationIssue(
                    policy_name="emergency_triage",
                    risk_category="clinical_escalation",
                    severity=1.0,
                    details=f"Emergency-related phrase detected: '{phrase}'. Requires immediate human escalation.",
                )
            )
            requires_escalation = True
            logger.warning("Emergency escalation triggered for phrase: {}", phrase)
            break

    # 1. Banned words
    for word in BANNED_WORDS:
        if word in text_lower:
            found_issues.append(
                ValidationIssue(
                    policy_name="banned_word_policy",
                    risk_category="content_policy",
                    severity=0.9,
                    details=f"The word '{word}' is not allowed.",
                )
            )
            validated_text = "[Content Redacted]"

    # 2. PII detection and redaction
    if validated_text != "[Content Redacted]":
        for pattern, name in PII_PATTERNS:
            if pattern.search(validated_text):
                found_issues.append(
                    ValidationIssue(
                        policy_name="pii_policy",
                        risk_category="pii",
                        severity=0.7,
                        details=f"Potential {name} detected and redacted.",
                    )
                )
                validated_text = pattern.sub(f"[REDACTED-{name}]", validated_text)
                break

    if found_issues:
        logger.warning("Validation found {} issue(s)", len(found_issues))
        return ValidateResponse(
            is_safe=False,
            validated_text=validated_text,
            issues=found_issues,
            requires_escalation=requires_escalation,
        )

    logger.debug("Validation passed")
    return ValidateResponse(is_safe=True, validated_text=validated_text, issues=[], requires_escalation=False)
