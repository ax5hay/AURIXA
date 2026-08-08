from __future__ import annotations

from dataclasses import dataclass


class InvalidTransition(ValueError):
    pass


TERMINAL = {"succeeded", "failed", "cancelled"}
TRANSITIONS: dict[str, set[str]] = {
    "pending_approval": {"queued", "cancel_requested", "cancelled"},
    "queued": {"dispatching", "running", "cancel_requested", "failed", "cancelled"},
    "dispatching": {"queued", "running", "cancel_requested", "failed"},
    "running": {"succeeded", "failed", "cancel_requested", "cancelled"},
    "cancel_requested": {"cancelled", "failed", "succeeded"},
    "succeeded": set(),
    "failed": set(),
    "cancelled": set(),
}


def transition(current: str, target: str) -> str:
    """Validate and return a deployment job state transition."""
    if current == target:
        return current
    if target not in TRANSITIONS.get(current, set()):
        raise InvalidTransition(f"Cannot transition deployment job from {current} to {target}")
    return target


@dataclass(frozen=True)
class CallbackState:
    job_status: str
    release_status: str | None = None


CALLBACK_STATES: dict[str, CallbackState] = {
    "job_started": CallbackState("running", "deploying"),
    "job_succeeded": CallbackState("succeeded", "deployed"),
    "job_failed": CallbackState("failed", "failed"),
    "job_cancelled": CallbackState("cancelled", "cancelled"),
}
