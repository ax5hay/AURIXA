import pytest

from deployment_controller.state_machine import InvalidTransition, transition


@pytest.mark.parametrize(
    ("current", "target"),
    [
        ("pending_approval", "queued"),
        ("queued", "dispatching"),
        ("dispatching", "running"),
        ("running", "succeeded"),
        ("running", "cancel_requested"),
        ("cancel_requested", "cancelled"),
    ],
)
def test_valid_transitions(current, target):
    assert transition(current, target) == target


def test_terminal_state_cannot_be_reopened():
    with pytest.raises(InvalidTransition):
        transition("succeeded", "running")


def test_duplicate_callback_transition_is_idempotent():
    assert transition("running", "running") == "running"
