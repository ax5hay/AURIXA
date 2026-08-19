"""Unit tests for agent workspace helper functions."""

from orchestration_engine.agent_helpers import draft_prompt, TERMINAL_LEAD_STAGES


def test_draft_prompt_includes_client_context():
    prompt = draft_prompt(
        "follow_up",
        {
            "client_name": "Jane Smith",
            "client_type": "buyer",
            "preferences": {"budget_max": 500000, "areas": ["Downtown"]},
            "notes": "Interested in Westside",
            "recent_showings": [],
        },
        channel="sms",
    )
    assert "Jane Smith" in prompt
    assert "follow_up" in prompt
    assert "SMS" in prompt
    assert "fair-housing" in prompt.lower() or "Fair" in prompt


def test_terminal_lead_stages_include_closed():
    assert "closed" in TERMINAL_LEAD_STAGES
    assert "lost" in TERMINAL_LEAD_STAGES
