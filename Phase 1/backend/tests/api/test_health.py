from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


def test_health_check(tmp_path) -> None:
    settings = Settings(
        database_url=f"sqlite+pysqlite:///{tmp_path / 'phase1.db'}",
    )

    with TestClient(create_app(settings)) as client:
        response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
