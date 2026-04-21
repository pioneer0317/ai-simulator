from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


def test_start_session_persists_study_context(tmp_path) -> None:
    """The backend should keep structured study metadata across the session lifecycle."""
    settings = Settings(
        database_url=f"sqlite+pysqlite:///{tmp_path / 'phase2.db'}",
    )

    with TestClient(create_app(settings)) as client:
        start_response = client.post(
            "/api/v1/simulator/sessions",
            json={
                "participant_id": "participant-study-1",
                "study_context": {
                    "run_mode": "training",
                    "scenario_variant": "ab_a",
                    "participant_archetype": "overtruster",
                    "workflow_context": "cisco_launch_readiness",
                    "has_ai_training": True,
                    "authority": "vp_engineering",
                    "time_pressure_seconds": 180,
                    "time_pressure_label": "high",
                    "info_scope": "partial",
                    "cohort_id": "pilot-cohort-1",
                    "experimental_flags": {
                        "reasoning_panel_enabled": True,
                        "dual_agent_conflict": True,
                    },
                },
                "metadata": {
                    "source": "prototype_admin",
                },
            },
        )
        assert start_response.status_code == 201
        start_payload = start_response.json()
        assert start_payload["study_context"]["run_mode"] == "training"
        assert start_payload["study_context"]["scenario_id"] == "cisco_product_launch_v1"
        assert start_payload["study_context"]["scenario_variant"] == "ab_a"
        assert start_payload["study_context"]["has_ai_training"] is True

        session_id = start_payload["session_id"]

        step_response = client.get(f"/api/v1/simulator/sessions/{session_id}/current-step")
        assert step_response.status_code == 200
        step_payload = step_response.json()
        assert step_payload["study_context"]["participant_archetype"] == "overtruster"
        assert step_payload["study_context"]["time_pressure_label"] == "high"
        assert step_payload["session_metadata"]["source"] == "prototype_admin"
        assert step_payload["session_metadata"]["study_context"]["cohort_id"] == "pilot-cohort-1"

        summary_response = client.get(f"/api/v1/simulator/sessions/{session_id}/summary")
        assert summary_response.status_code == 200
        summary_payload = summary_response.json()
        assert summary_payload["study_context"]["workflow_context"] == "cisco_launch_readiness"
        assert summary_payload["event_logs"][0]["payload"]["run_mode"] == "training"
        assert summary_payload["event_logs"][0]["payload"]["scenario_variant"] == "ab_a"


def test_phase2_simulator_flow(tmp_path) -> None:
    """The canonical Phase 2 API should support the full persisted session loop."""
    settings = Settings(
        database_url=f"sqlite+pysqlite:///{tmp_path / 'phase2.db'}",
    )

    with TestClient(create_app(settings)) as client:
        start_response = client.post(
            "/api/v1/simulator/sessions",
            json={"participant_id": "participant-1"},
        )
        assert start_response.status_code == 201
        session_id = start_response.json()["session_id"]

        role_response = client.get(f"/api/v1/simulator/sessions/{session_id}/current-step")
        assert role_response.status_code == 200
        role_payload = role_response.json()
        assert role_payload["scenario_id"] == "cisco_product_launch_v1"
        assert role_payload["step"]["phase"] == "role"
        assert role_payload["advisor_outputs"] == []

        choose_role_response = client.post(
            f"/api/v1/simulator/sessions/{session_id}/actions",
            json={
                "action_id": "vp_engineering",
                "metadata": {"prototype_role_card": True},
            },
        )
        assert choose_role_response.status_code == 200
        assert choose_role_response.json()["reflection_required"] is False
        assert choose_role_response.json()["next_step_id"] == "step_brief_vp"

        brief_response = client.get(f"/api/v1/simulator/sessions/{session_id}/current-step")
        assert brief_response.status_code == 200
        brief_payload = brief_response.json()
        assert brief_payload["step"]["phase"] == "brief"
        assert brief_payload["session_metadata"]["participant_role"] == "VP Engineering"
        assert [advisor["display_name"] for advisor in brief_payload["advisor_outputs"]] == [
            "AI Analyst",
            "AI Risk Monitor",
        ]

        premature_reflection_response = client.post(
            f"/api/v1/simulator/sessions/{session_id}/reflection",
            json={
                "reflection": "I trusted the coordination-heavy recommendation because the system state was ambiguous.",
                "confidence": 0.74,
            },
        )
        assert premature_reflection_response.status_code == 400

        continue_response = client.post(
            f"/api/v1/simulator/sessions/{session_id}/actions",
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

        decide_response = client.get(f"/api/v1/simulator/sessions/{session_id}/current-step")
        assert decide_response.status_code == 200
        decide_payload = decide_response.json()
        assert decide_payload["step"]["phase"] == "decide"
        assert decide_payload["advisor_outputs"] == []

        decision_action_response = client.post(
            f"/api/v1/simulator/sessions/{session_id}/actions",
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
            f"/api/v1/simulator/sessions/{session_id}/reflection",
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

        summary_response = client.get(f"/api/v1/simulator/sessions/{session_id}/summary")
        assert summary_response.status_code == 200
        summary_payload = summary_response.json()
        assert summary_payload["status"] == "completed"
        assert summary_payload["scenario_title"] == "Cisco Product Launch Decision"
        assert summary_payload["session_metadata"]["participant_role"] == "VP Engineering"
        assert len(summary_payload["step_responses"]) == 3
        assert len(summary_payload["event_logs"]) >= 7
        assert summary_payload["step_responses"][-1]["decision_metadata"]["decision_path"] == "C"
        assert summary_payload["step_responses"][-1]["reflection_metadata"]["accountability_view"] == "all"

        completed_step_response = client.get(f"/api/v1/simulator/sessions/{session_id}/current-step")
        assert completed_step_response.status_code == 409

        completed_action_response = client.post(
            f"/api/v1/simulator/sessions/{session_id}/actions",
            json={"action_id": "launch_now"},
        )
        assert completed_action_response.status_code == 409

        completed_reflection_response = client.post(
            f"/api/v1/simulator/sessions/{session_id}/reflection",
            json={"reflection": "late reflection"},
        )
        assert completed_reflection_response.status_code == 409


def test_scenario_catalog_and_exports(tmp_path) -> None:
    """Catalog and export endpoints should expose the real scenario set for researchers."""
    settings = Settings(
        database_url=f"sqlite+pysqlite:///{tmp_path / 'phase2.db'}",
    )

    with TestClient(create_app(settings)) as client:
        catalog_response = client.get("/api/v1/simulator/scenarios")
        assert catalog_response.status_code == 200
        catalog_payload = catalog_response.json()
        scenario_ids = {scenario["scenario_id"] for scenario in catalog_payload}
        assert {
            "cisco_product_launch_v1",
            "false_certainty_trap_v1",
            "context_hoarder_crisis_v1",
            "governance_bypass_v1",
        }.issubset(scenario_ids)

        start_response = client.post(
            "/api/v1/simulator/sessions",
            json={
                "participant_id": "participant-exports-1",
                "scenario_id": "governance_bypass_v1",
            },
        )
        assert start_response.status_code == 201
        session_id = start_response.json()["session_id"]

        role_response = client.get(f"/api/v1/simulator/sessions/{session_id}/current-step")
        assert role_response.status_code == 200
        assert role_response.json()["scenario_id"] == "governance_bypass_v1"

        choose_role_response = client.post(
            f"/api/v1/simulator/sessions/{session_id}/actions",
            json={"action_id": "product_manager"},
        )
        assert choose_role_response.status_code == 200

        continue_response = client.post(
            f"/api/v1/simulator/sessions/{session_id}/actions",
            json={"action_id": "continue_to_decision"},
        )
        assert continue_response.status_code == 200

        decision_response = client.post(
            f"/api/v1/simulator/sessions/{session_id}/actions",
            json={
                "action_id": "request_documented_exception",
                "rationale": "If the process is bypassed, the override should stay explicit.",
            },
        )
        assert decision_response.status_code == 200
        assert decision_response.json()["reflection_required"] is True

        reflection_response = client.post(
            f"/api/v1/simulator/sessions/{session_id}/reflection",
            json={
                "reflection": "Social pressure was real, but explicit accountability mattered more.",
                "confidence": 0.79,
                "metadata": {"governance_signal": "preserved_accountability"},
            },
        )
        assert reflection_response.status_code == 200
        assert reflection_response.json()["is_completed"] is True

        summary_response = client.get(f"/api/v1/simulator/sessions/{session_id}/summary")
        assert summary_response.status_code == 200
        summary_payload = summary_response.json()
        assert summary_payload["scenario_title"] == "Governance Bypass Under Pressure"
        assert summary_payload["scenario_metadata"]["category"] == "governance_vs_speed"

        steps_export_response = client.get(
            f"/api/v1/simulator/sessions/{session_id}/export?view=steps"
        )
        assert steps_export_response.status_code == 200
        assert steps_export_response.headers["content-type"].startswith("text/csv")
        assert "attachment;" in steps_export_response.headers["content-disposition"]
        assert "scenario_title" in steps_export_response.text
        assert "participant_role" in steps_export_response.text
        assert "Governance Bypass Under Pressure" in steps_export_response.text
        assert "Product Manager" in steps_export_response.text

        events_export_response = client.get(
            f"/api/v1/simulator/sessions/{session_id}/export?view=events"
        )
        assert events_export_response.status_code == 200
        assert "scenario_category" in events_export_response.text
        assert "request_documented_exception" in events_export_response.text
