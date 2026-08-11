import os
import re
from contextlib import asynccontextmanager
from fastapi import FastAPI
from loguru import logger

from .models import ValidateRequest, ValidateResponse, ValidationIssue

# Configurable via env (comma-separated). Extend for production.
_BANNED = os.getenv("SAFETY_BANNED_WORDS", "unsafe,exploit,vulnerability,pii_leak")
BANNED_WORDS = {w.strip().lower() for w in _BANNED.split(",") if w.strip()}


def _parse_env_phrases(key: str, default: str) -> tuple[str, ...]:
    raw = os.getenv(key, default)
    return tuple(w.strip().lower() for w in raw.split(",") if w.strip())


# Real estate safety policies (replace clinical triage)
FAIR_HOUSING_PHRASES = _parse_env_phrases(
    "SAFETY_FAIR_HOUSING_KEYWORDS",
    "no section 8,no children,whites only,white tenants,only white,no kids,no families,"
    "no muslims,no blacks,prefer white,don't rent to,steer away from,"
    "avoid that neighborhood because of,only rent to men,only rent to women,no disabled,"
    "christians only,english only tenants,must be white,no hispanics,no asians",
)

LEGAL_ADVICE_PHRASES = _parse_env_phrases(
    "SAFETY_LEGAL_KEYWORDS",
    "legal advice,is this contract binding,can i sue,attorney review,"
    "interpret the lease,title dispute,foreclosure lawsuit,contract enforceable,"
    "is this legal,do i need a lawyer",
)

FRAUD_PHRASES = _parse_env_phrases(
    "SAFETY_FRAUD_KEYWORDS",
    "wire transfer immediately,send money today,gift card payment,"
    "urgent wire,cryptocurrency deposit,verify your account wire,"
    "closing wire instructions changed,send bitcoin to close",
)

PROPERTY_EMERGENCY_PHRASES = _parse_env_phrases(
    "SAFETY_PROPERTY_EMERGENCY_KEYWORDS",
    "gas leak,carbon monoxide,fire in the building,break-in in progress,"
    "flooding in unit,water main break,structural collapse,smoke in hallway",
)

# Simple PII patterns - redact in production
PII_PATTERNS = [
    (re.compile(r"\b\d{3}-\d{2}-\d{4}\b"), "SSN"),
    (re.compile(r"\b\d{16}\b"), "Credit card"),
    (re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"), "Email"),
    (re.compile(r"\b\d{10,}\b"), "Phone/ID"),
]

FAIR_HOUSING_REDACTED = "[Content Redacted - Fair Housing Policy]"


def _first_matching_phrase(text_lower: str, phrases: tuple[str, ...]) -> str | None:
    for phrase in phrases:
        if phrase in text_lower:
            return phrase
    return None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Log service startup and shutdown."""
    logger.info("Safety Guardrails service starting up")
    yield
    logger.info("Safety Guardrails service shutting down")


app = FastAPI(
    title="AURIXA Safety Guardrails",
    version="0.2.0",
    lifespan=lifespan,
    description="Enforces real estate safety policies on LLM inputs and outputs.",
)


@app.get("/health", summary="Health check endpoint")
async def health():
    """Return a 200 OK status if the service is healthy."""
    return {"service": "safety-guardrails", "status": "healthy"}


@app.post("/api/v1/validate", response_model=ValidateResponse, summary="Validate text against safety policies")
async def validate(request: ValidateRequest):
    """Validates text against fair housing, legal, fraud, PII, and content policies."""
    text = request.text or ""
    text_lower = text.lower()
    found_issues: list[ValidationIssue] = []
    validated_text = text
    requires_escalation = False
    escalation_type: str | None = None

    # 1. Fair housing — block discriminatory steering or preferences
    fh_phrase = _first_matching_phrase(text_lower, FAIR_HOUSING_PHRASES)
    if fh_phrase:
        found_issues.append(
            ValidationIssue(
                policy_name="fair_housing_violation",
                risk_category="fair_housing",
                severity=1.0,
                details=(
                    f"Potentially discriminatory phrase detected: '{fh_phrase}'. "
                    "Requests that filter by protected class are not permitted."
                ),
            )
        )
        requires_escalation = True
        escalation_type = "fair_housing"
        validated_text = FAIR_HOUSING_REDACTED
        logger.warning("Fair housing policy triggered for phrase: {}", fh_phrase)

    # 2. Fraud / wire-scam patterns — escalate immediately
    if validated_text != FAIR_HOUSING_REDACTED:
        fraud_phrase = _first_matching_phrase(text_lower, FRAUD_PHRASES)
        if fraud_phrase:
            found_issues.append(
                ValidationIssue(
                    policy_name="fraud_escalation",
                    risk_category="fraud",
                    severity=1.0,
                    details=f"Potential fraud or wire-scam pattern detected: '{fraud_phrase}'.",
                )
            )
            requires_escalation = True
            escalation_type = escalation_type or "fraud"
            logger.warning("Fraud escalation triggered for phrase: {}", fraud_phrase)

    # 3. Legal advice requests — disclaim and escalate to staff
    if validated_text != FAIR_HOUSING_REDACTED:
        legal_phrase = _first_matching_phrase(text_lower, LEGAL_ADVICE_PHRASES)
        if legal_phrase:
            found_issues.append(
                ValidationIssue(
                    policy_name="legal_escalation",
                    risk_category="legal",
                    severity=0.85,
                    details=f"Legal advice pattern detected: '{legal_phrase}'.",
                )
            )
            requires_escalation = True
            escalation_type = escalation_type or "legal"
            logger.warning("Legal escalation triggered for phrase: {}", legal_phrase)

    # 4. Property life-safety emergencies — escalate to staff / 911 guidance
    if validated_text != FAIR_HOUSING_REDACTED:
        emergency_phrase = _first_matching_phrase(text_lower, PROPERTY_EMERGENCY_PHRASES)
        if emergency_phrase:
            found_issues.append(
                ValidationIssue(
                    policy_name="property_emergency",
                    risk_category="property_emergency",
                    severity=1.0,
                    details=f"Property emergency phrase detected: '{emergency_phrase}'.",
                )
            )
            requires_escalation = True
            escalation_type = escalation_type or "property_emergency"
            logger.warning("Property emergency escalation for phrase: {}", emergency_phrase)

    # 5. Banned words
    if validated_text != FAIR_HOUSING_REDACTED:
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

    # 6. PII detection and redaction
    if validated_text not in (FAIR_HOUSING_REDACTED, "[Content Redacted]"):
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
            is_safe=validated_text not in (FAIR_HOUSING_REDACTED, "[Content Redacted]"),
            validated_text=validated_text,
            issues=found_issues,
            requires_escalation=requires_escalation,
            escalation_type=escalation_type,
        )

    logger.debug("Validation passed")
    return ValidateResponse(
        is_safe=True,
        validated_text=validated_text,
        issues=[],
        requires_escalation=False,
        escalation_type=None,
    )
