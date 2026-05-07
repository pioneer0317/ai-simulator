from __future__ import annotations

import json
from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from app.services.episodes.engine import EpisodeEngine
from app.services.episodes.loader import EpisodeLoader
from app.services.llm.client import GeminiLLMClient


PROJECT_ROOT = Path(__file__).resolve().parents[2]


def _settings(
    *,
    llm_enabled: bool = False,
    agent_enabled: bool = False,
    fallback_enabled: bool = True,
    provider: str = "disabled",
    app_env: str = "dev",
    storage_backend: str = "memory",
    database_url: str | None = None,
) -> Settings:
    return Settings(
        app_env=app_env,
        storage_backend=storage_backend,
        database_url=database_url,
        episode_config_dir=PROJECT_ROOT / "configs" / "episodes",
        scoring_rubric_path=PROJECT_ROOT / "configs" / "scoring" / "dimension_rubric.yaml",
        prompt_template_dir=PROJECT_ROOT / "configs" / "prompts",
        llm_grader_enabled=llm_enabled,
        llm_agent_enabled=agent_enabled,
        assistant_fallback_enabled=fallback_enabled,
        llm_provider=provider,
    )


def test_participant_episode_redacts_hidden_context() -> None:
    loader = EpisodeLoader(PROJECT_ROOT / "configs" / "episodes")
    episode = loader.get("stakeholder_report_error_v1")

    participant = EpisodeEngine.participant_view(episode)

    assert participant.episode_id == "stakeholder_report_error_v1"
    assert {artifact.artifact_id for artifact in participant.artifacts} == {
        "email_stakeholder_reply",
        "prior_agent_summary",
        "launch_readiness_dashboard",
        "telemetry_delay_note",
    }
    assert "evaluator_key" not in {artifact.artifact_id for artifact in participant.artifacts}
    assert "hidden_ground_truth" not in participant.model_dump()


def test_episode_session_scores_level_1_and_returns_disabled_llm_review() -> None:
    with TestClient(create_app(_settings())) as client:
        catalog = client.get("/api/v1/episodes")
        assert catalog.status_code == 200
        assert catalog.json()[0]["episode_id"] == "stakeholder_report_error_v1"

        start = client.post(
            "/api/v1/sessions",
            json={
                "episode_id": "stakeholder_report_error_v1",
                "participant_profile": {
                    "participant_id": "p-001",
                    "industry": "Technology",
                    "function": "Product",
                    "level": "Manager",
                    "ai_relationship_label": "collaborator",
                },
            },
        )
        assert start.status_code == 201
        session_id = start.json()["session_id"]
        visible_artifact_ids = {
            artifact["artifact_id"] for artifact in start.json()["participant_episode"]["artifacts"]
        }
        assert "evaluator_key" not in visible_artifact_ids

        events = [
            {
                "event_type": "artifact_opened",
                "actor": "participant",
                "artifact_id": "prior_agent_summary",
            },
            {
                "event_type": "artifact_opened",
                "actor": "participant",
                "artifact_id": "launch_readiness_dashboard",
            },
            {
                "event_type": "user_message",
                "actor": "participant",
                "content": (
                    "Mira, first verify the sent summary against the source dashboard "
                    "and show the discrepancy before sending anything else."
                ),
            },
            {
                "event_type": "user_message",
                "actor": "participant",
                "content": (
                    "The SVP is using this in the launch meeting in ten minutes, so "
                    "help me understand the confidence limitation and what changed."
                ),
            },
            {
                "event_type": "final_response",
                "actor": "participant",
                "content": (
                    "I will own the correction, notify the stakeholder that the source "
                    "dashboard says 13%, document the correction note, and explain the "
                    "moderate confidence due to delayed telemetry."
                ),
            },
        ]
        for event in events:
            response = client.post(f"/api/v1/sessions/{session_id}/events", json=event)
            assert response.status_code == 200

        score = client.post(f"/api/v1/sessions/{session_id}/score")
        assert score.status_code == 200
        payload = score.json()
        assert payload["llm_review"]["status"] == "disabled"
        assert payload["deterministic"]["rubric_version"] == "episode-rubric-v1"
        scores = payload["deterministic"]["scores"]
        assert scores["evidence_verification"]["score"] > 80
        assert scores["accountability"]["score"] > 70
        assert scores["instruction_clarity"]["score"] > 70
        assert scores["uncertainty_recognition"]["status"] == "observed"


def test_sqlite_storage_persists_session_events_across_app_restarts(tmp_path: Path) -> None:
    database_url = f"sqlite:///{tmp_path / 'simulator-test.sqlite'}"
    settings = _settings(storage_backend="sqlite", database_url=database_url)

    with TestClient(create_app(settings)) as client:
        start = client.post(
            "/api/v1/sessions",
            json={"episode_id": "stakeholder_report_error_v1"},
        )
        assert start.status_code == 201
        session_id = start.json()["session_id"]

        event = client.post(
            f"/api/v1/sessions/{session_id}/events",
            json={
                "event_type": "artifact_opened",
                "actor": "participant",
                "artifact_id": "launch_readiness_dashboard",
                "metadata": {"ui_surface": "mail_window"},
            },
        )
        assert event.status_code == 200

    with TestClient(create_app(settings)) as restarted_client:
        state = restarted_client.get(f"/api/v1/sessions/{session_id}")

    assert state.status_code == 200
    payload = state.json()
    assert payload["session_id"] == session_id
    assert payload["events"][0]["event_type"] == "artifact_opened"
    assert payload["events"][0]["artifact_id"] == "launch_readiness_dashboard"
    assert payload["events"][0]["metadata"]["ui_surface"] == "mail_window"


def test_admin_dashboard_endpoints_return_sessions_and_csv_export(tmp_path: Path) -> None:
    database_url = f"sqlite:///{tmp_path / 'simulator-admin-test.sqlite'}"
    settings = _settings(storage_backend="sqlite", database_url=database_url)

    with TestClient(create_app(settings)) as client:
        start = client.post(
            "/api/v1/sessions",
            json={
                "episode_id": "stakeholder_report_error_v1",
                "participant_profile": {"participant_id": "admin-check"},
            },
        )
        assert start.status_code == 201
        session_id = start.json()["session_id"]

        event = client.post(
            f"/api/v1/sessions/{session_id}/events",
            json={
                "event_type": "notification_clicked",
                "actor": "participant",
                "metadata": {"notification_id": "email-1"},
            },
        )
        assert event.status_code == 200

        sessions = client.get("/api/v1/admin/sessions")
        assert sessions.status_code == 200
        payload = sessions.json()
        assert payload[0]["session_id"] == session_id
        assert payload[0]["event_count"] == 1

        export = client.get("/api/v1/admin/events.csv")
        assert export.status_code == 200
        assert "text/csv" in export.headers["content-type"]
        assert "notification_clicked" in export.text
        assert "admin-check" in export.text


def test_frontend_flow_describes_unified_research_routes() -> None:
    with TestClient(create_app(_settings())) as client:
        flow = client.get("/api/v1/frontend-flow")

        assert flow.status_code == 200
        payload = flow.json()
        assert payload["flow_id"] == "unified-desktop-flow"
        assert payload["default_episode_id"] == "stakeholder_report_error_v1"
        assert [route["path"] for route in payload["routes"]] == [
            "/",
            "/simulation",
            "/reflection",
            "/analytics",
        ]
        assert payload["backend_capabilities"]["session_event_logging"] is True
        assert payload["backend_capabilities"]["scenario_bound_assistant"] is True
        assert payload["backend_capabilities"]["assistant_fallback_enabled"] is True


def test_unified_frontend_lifecycle_captures_survey_reflection_and_completion() -> None:
    with TestClient(create_app(_settings())) as client:
        start = client.post(
            "/api/v1/sessions",
            json={
                "episode_id": "stakeholder_report_error_v1",
                "participant_profile": {"participant_id": "p-frontend"},
            },
        )
        assert start.status_code == 201
        session_id = start.json()["session_id"]

        pre = client.post(
            f"/api/v1/sessions/{session_id}/pre-questionnaire",
            json={
                "functional_area": "Product",
                "level": "Manager",
                "training_status": "Some formal training",
                "answers": [
                    {
                        "question_id": "ai_confidence",
                        "value": "4",
                        "label": "Moderately confident",
                    }
                ],
            },
        )
        assert pre.status_code == 200
        assert pre.json()["event"]["event_type"] == "pre_questionnaire_submitted"
        assert pre.json()["event"]["metadata"]["functional_area"] == "Product"

        reflection = client.post(
            f"/api/v1/sessions/{session_id}/reflection",
            json={
                "main_influence": "I trusted the source dashboard more than the sent summary.",
                "trust_reason": "The assistant helped compare evidence.",
                "unchecked_reason": "Time pressure was high.",
            },
        )
        assert reflection.status_code == 200
        reflection_event = reflection.json()["event"]
        assert reflection_event["event_type"] == "post_reflection_submitted"
        assert "source dashboard" in reflection_event["content"]

        complete = client.post(
            f"/api/v1/sessions/{session_id}/complete",
            json={
                "final_response": "I will correct the number and own the stakeholder note.",
                "metadata": {"ui_route": "/simulation"},
            },
        )
        assert complete.status_code == 200
        assert complete.json()["event"]["event_type"] == "scenario_completed"

        state = client.get(f"/api/v1/sessions/{session_id}")
        assert state.status_code == 200
        payload = state.json()
        assert payload["status"] == "completed"
        assert [event["event_type"] for event in payload["events"]] == [
            "pre_questionnaire_submitted",
            "post_reflection_submitted",
            "scenario_completed",
        ]


def test_llm_grader_fixture_can_run_as_second_pass() -> None:
    with TestClient(create_app(_settings(llm_enabled=True, provider="fixture"))) as client:
        start = client.post(
            "/api/v1/sessions",
            json={"episode_id": "stakeholder_report_error_v1"},
        )
        assert start.status_code == 201
        session_id = start.json()["session_id"]

        event_response = client.post(
            f"/api/v1/sessions/{session_id}/events",
            json={
                "event_type": "final_response",
                "actor": "participant",
                "content": "I will own the correction and document the stakeholder follow up.",
            },
        )
        assert event_response.status_code == 200

        score = client.post(f"/api/v1/sessions/{session_id}/score")
        assert score.status_code == 200
        llm_review = score.json()["llm_review"]
        assert llm_review["status"] == "completed"
        assert llm_review["provider"] == "fixture"
        assert llm_review["parsed"]["dimension_reviews"]["accountability"]["score"] == 86


def test_gemini_client_calls_generate_content_and_parses_text(monkeypatch) -> None:
    captured = {}

    class FakeResponse:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, traceback):
            return False

        def read(self):
            return json.dumps(
                {
                    "candidates": [
                        {
                            "content": {
                                "parts": [
                                    {"text": "I checked the source dashboard."},
                                    {"text": " It says 13%."},
                                ]
                            }
                        }
                    ]
                }
            ).encode("utf-8")

    def fake_urlopen(request, timeout):
        captured["url"] = request.full_url
        captured["body"] = json.loads(request.data.decode("utf-8"))
        captured["timeout"] = timeout
        return FakeResponse()

    monkeypatch.setattr("app.services.llm.client.urlopen", fake_urlopen)

    client = GeminiLLMClient(
        api_key="test-key",
        model="gemini-2.5-flash-lite",
        timeout_seconds=7.0,
    )
    completion = client.complete("Check the source.")

    assert completion.text == "I checked the source dashboard. It says 13%."
    assert completion.model == "gemini-2.5-flash-lite"
    assert captured["timeout"] == 7.0
    assert captured["url"].endswith("/models/gemini-2.5-flash-lite:generateContent?key=test-key")
    assert captured["body"]["contents"][0]["parts"][0]["text"] == "Check the source."


def test_prod_environment_only_exposes_approved_episodes() -> None:
    with TestClient(create_app(_settings(app_env="prod"))) as client:
        catalog = client.get("/api/v1/episodes")
        assert catalog.status_code == 200
        assert catalog.json() == []

        hidden = client.get("/api/v1/episodes/stakeholder_report_error_v1")
        assert hidden.status_code == 404

        start = client.post(
            "/api/v1/sessions",
            json={"episode_id": "stakeholder_report_error_v1"},
        )
        assert start.status_code == 404


def test_level_3_agent_turn_uses_bounded_episode_context() -> None:
    with TestClient(
        create_app(_settings(agent_enabled=True, provider="fixture"))
    ) as client:
        start = client.post(
            "/api/v1/sessions",
            json={"episode_id": "stakeholder_report_error_v1"},
        )
        assert start.status_code == 201
        session_id = start.json()["session_id"]

        turn = client.post(
            f"/api/v1/sessions/{session_id}/agent-turn",
            json={
                "message": "Can you verify the summary against the source dashboard?",
                "referenced_artifact_ids": [
                    "prior_agent_summary",
                    "launch_readiness_dashboard",
                ],
            },
        )

        assert turn.status_code == 200
        payload = turn.json()
        assert payload["status"] == "completed"
        assert payload["provider"] == "fixture"
        assert payload["model"] == "fixture-agent-v1"
        assert payload["prompt_version"] == "enterprise-agent-response-v1"
        assert "dashboard source shows 13%" in payload["agent_event"]["content"]
        assert payload["agent_event"]["metadata"]["bounded_context"] is True

        state = client.get(f"/api/v1/sessions/{session_id}")
        assert state.status_code == 200
        events = state.json()["events"]
        assert [event["event_type"] for event in events] == ["user_message", "agent_message"]
        assert events[0]["metadata"]["referenced_artifact_ids"] == [
            "prior_agent_summary",
            "launch_readiness_dashboard",
        ]


def test_level_3_agent_turn_uses_scenario_fallback_when_llm_agent_disabled() -> None:
    with TestClient(create_app(_settings())) as client:
        start = client.post(
            "/api/v1/sessions",
            json={"episode_id": "stakeholder_report_error_v1"},
        )
        assert start.status_code == 201
        session_id = start.json()["session_id"]

        turn = client.post(
            f"/api/v1/sessions/{session_id}/agent-turn",
            json={"message": "Can you check the source?"},
        )
        assert turn.status_code == 200
        payload = turn.json()
        assert payload["status"] == "fallback"
        assert payload["provider"] == "scenario_fallback"
        assert payload["model"] == "scenario-fallback-v1"
        assert payload["prompt_version"] == "scenario-fallback-rules-v1"
        assert "prior summary used 3%" in payload["agent_event"]["content"]
        assert "source record says 13%" in payload["agent_event"]["content"]
        assert payload["agent_event"]["metadata"]["bounded_context"] is True

        state = client.get(f"/api/v1/sessions/{session_id}")
        assert state.status_code == 200
        assert [event["event_type"] for event in state.json()["events"]] == [
            "user_message",
            "agent_message",
        ]


def test_level_3_agent_turn_reports_disabled_when_fallback_disabled() -> None:
    with TestClient(create_app(_settings(fallback_enabled=False))) as client:
        start = client.post(
            "/api/v1/sessions",
            json={"episode_id": "stakeholder_report_error_v1"},
        )
        assert start.status_code == 201
        session_id = start.json()["session_id"]

        turn = client.post(
            f"/api/v1/sessions/{session_id}/agent-turn",
            json={"message": "Can you check the source?"},
        )
        assert turn.status_code == 200
        payload = turn.json()
        assert payload["status"] == "disabled"
        assert payload["agent_event"] is None
        assert payload["prompt_version"] == "enterprise-agent-response-v1"
