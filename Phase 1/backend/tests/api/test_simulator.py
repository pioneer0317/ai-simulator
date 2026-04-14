from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


def test_phase1_simulator_flow(tmp_path) -> None:
    settings = Settings(
        database_url=f"sqlite+pysqlite:///{tmp_path / 'phase1.db'}",
    )

    with TestClient(create_app(settings)) as client:
        start_response = client.post("/api/v1/sessions", json={"participant_id": "participant-1"})
        assert start_response.status_code == 201
        session_id = start_response.json()["session_id"]

        role_response = client.get(f"/api/v1/sessions/{session_id}/step")
        assert role_response.status_code == 200
        role_payload = role_response.json()
        assert role_payload["scenario_id"] == "cisco_product_launch_v1"
        assert role_payload["step"]["phase"] == "role"
        assert role_payload["advisor_outputs"] == []

        choose_role_response = client.post(
            f"/api/v1/sessions/{session_id}/action",
            json={
                "action_id": "vp_engineering",
                "metadata": {"prototype_role_card": True},
            },
        )
        assert choose_role_response.status_code == 200
        assert choose_role_response.json()["reflection_required"] is False
        assert choose_role_response.json()["next_step_id"] == "step_brief_vp"

        brief_response = client.get(f"/api/v1/sessions/{session_id}/step")
        assert brief_response.status_code == 200
        brief_payload = brief_response.json()
        assert brief_payload["step"]["phase"] == "brief"
        assert brief_payload["session_metadata"]["participant_role"] == "VP Engineering"
        assert [advisor["display_name"] for advisor in brief_payload["advisor_outputs"]] == [
            "AI Analyst",
            "AI Risk Monitor",
        ]

        review_response = client.post(
            f"/api/v1/sessions/{session_id}/reflection",
            json={
                "reflection": "I trusted the coordination-heavy recommendation because the system state was ambiguous.",
                "confidence": 0.74,
            },
        )
        assert review_response.status_code == 400

        continue_response = client.post(
            f"/api/v1/sessions/{session_id}/action",
            json={
                "action_id": "review_and_decide",
                "metadata": {
                    "agent1_conf_setting": 90,
                    "agent2_conf_setting": 70,
                    "training_data_enabled": False,
                },
            },
        )
        assert continue_response.status_code == 200
        assert continue_response.json()["reflection_required"] is False
        assert continue_response.json()["next_step_id"] == "step_decide_vp"

        decide_response = client.get(f"/api/v1/sessions/{session_id}/step")
        assert decide_response.status_code == 200
        decide_payload = decide_response.json()
        assert decide_payload["step"]["phase"] == "decide"
        assert decide_payload["advisor_outputs"] == []

        decision_action_response = client.post(
            f"/api/v1/sessions/{session_id}/action",
            json={
                "action_id": "escalate_upward",
                "rationale": "This needs leadership cover because both signals are credible.",
                "metadata": {
                    "decision_path": "C",
                    "time_to_decide_seconds": 78,
                    "reasoning_viewed": "Neither",
                },
            },
        )
        assert decision_action_response.status_code == 200
        assert decision_action_response.json()["reflection_required"] is True

        finish_reflection_response = client.post(
            f"/api/v1/sessions/{session_id}/reflection",
            json={
                "reflection": "I trusted the Analyst only moderately and felt accountability stayed collective.",
                "confidence": 0.81,
                "metadata": {
                    "post_trust_agent1": 5,
                    "decision_confidence": 5,
                    "accountability_view": "all",
                    "time_pressure_effect": "rushed",
                },
            },
        )
        assert finish_reflection_response.status_code == 200
        assert finish_reflection_response.json()["is_completed"] is True

        summary_response = client.get(f"/api/v1/sessions/{session_id}/summary")
        assert summary_response.status_code == 200
        summary_payload = summary_response.json()
        assert summary_payload["status"] == "completed"
        assert summary_payload["session_metadata"]["participant_role"] == "VP Engineering"
        assert len(summary_payload["step_responses"]) == 3
        assert len(summary_payload["event_logs"]) == 9
        assert summary_payload["step_responses"][-1]["decision_metadata"]["decision_path"] == "C"
        assert summary_payload["step_responses"][-1]["reflection_metadata"]["accountability_view"] == "all"

        completed_step_response = client.get(f"/api/v1/sessions/{session_id}/step")
        assert completed_step_response.status_code == 409

        completed_action_response = client.post(
            f"/api/v1/sessions/{session_id}/action",
            json={"action_id": "launch_now"},
        )
        assert completed_action_response.status_code == 409

        completed_reflection_response = client.post(
            f"/api/v1/sessions/{session_id}/reflection",
            json={"reflection": "late reflection"},
        )
        assert completed_reflection_response.status_code == 409
