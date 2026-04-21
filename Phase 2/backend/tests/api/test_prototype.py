from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


def test_prototype_session_flow(tmp_path) -> None:
    """The backend should persist the Figma-aligned prototype session state."""
    settings = Settings(
        database_url=f"sqlite+pysqlite:///{tmp_path / 'phase2.db'}",
    )

    with TestClient(create_app(settings)) as client:
        create_response = client.post(
            "/api/v1/prototype/sessions",
            json={
                "professional_role": "hr",
                "simulation_mode": "testing",
                "metadata": {"source": "prototype-ui"},
            },
        )
        assert create_response.status_code == 201
        create_payload = create_response.json()
        assert create_payload["professional_role"] == "hr"
        assert create_payload["simulation_mode"] == "testing"
        session_id = create_payload["session_id"]

        sync_response = client.put(
            f"/api/v1/prototype/sessions/{session_id}/state",
            json={
                "current_route": "/live-chat",
                "professional_role": "hr",
                "task_completed": False,
                "conversation_turn": 3,
                "show_context_dashboard": True,
                "messages": [
                    {
                        "id": "m1",
                        "sender": "agent",
                        "content": "Initial greeting",
                        "timestamp": "2026-04-21T12:00:00Z",
                    },
                    {
                        "id": "m2",
                        "sender": "user",
                        "content": "Can you verify that credential?",
                        "timestamp": "2026-04-21T12:00:05Z",
                    },
                ],
                "data_snapshot": {
                    "simulationMode": "testing",
                    "collaborationScore": 82,
                    "userActions": [{"id": "a1", "type": "audit-source"}],
                },
            },
        )
        assert sync_response.status_code == 200
        sync_payload = sync_response.json()
        assert sync_payload["current_route"] == "/live-chat"
        assert sync_payload["snapshot"]["data_snapshot"]["collaborationScore"] == 82
        assert sync_payload["status"] == "active"

        get_response = client.get(f"/api/v1/prototype/sessions/{session_id}/state")
        assert get_response.status_code == 200
        get_payload = get_response.json()
        assert get_payload["professional_role"] == "hr"
        assert len(get_payload["snapshot"]["messages"]) == 2

        complete_response = client.put(
            f"/api/v1/prototype/sessions/{session_id}/state",
            json={
                "current_route": "/analytics",
                "professional_role": "hr",
                "task_completed": True,
                "conversation_turn": 10,
                "show_context_dashboard": True,
                "messages": [],
                "data_snapshot": {
                    "accuracyScore": 90,
                },
            },
        )
        assert complete_response.status_code == 200
        complete_payload = complete_response.json()
        assert complete_payload["status"] == "completed"
        assert complete_payload["completed_at"] is not None
