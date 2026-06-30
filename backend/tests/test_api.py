from __future__ import annotations

from fastapi.testclient import TestClient

from app.db import init_db
from app.main import app


def test_health_and_seed_data(tmp_path, monkeypatch):
    monkeypatch.setenv("APP_DATABASE_PATH", str(tmp_path / "dashboard.sqlite3"))
    init_db()
    client = TestClient(app)

    health = client.get("/api/health")
    assert health.status_code == 200
    assert health.json()["status"] == "ok"

    tasks = client.get("/api/tasks")
    assert tasks.status_code == 200
    assert len(tasks.json()) >= 4


def test_create_and_patch_task(tmp_path, monkeypatch):
    monkeypatch.setenv("APP_DATABASE_PATH", str(tmp_path / "dashboard.sqlite3"))
    init_db()
    client = TestClient(app)

    created = client.post(
        "/api/tasks",
        json={
            "title": "Notion同期テスト",
            "project": "QA",
            "status": "todo",
            "priority": "high",
            "channel": "Development",
            "progress": 10,
        },
    )
    assert created.status_code == 201
    task_id = created.json()["id"]

    patched = client.patch(f"/api/tasks/{task_id}", json={"status": "doing", "progress": 55})
    assert patched.status_code == 200
    assert patched.json()["status"] == "doing"
    assert patched.json()["progress"] == 55


def test_notion_sync_without_secrets_is_safe(tmp_path, monkeypatch):
    monkeypatch.setenv("APP_DATABASE_PATH", str(tmp_path / "dashboard.sqlite3"))
    monkeypatch.delenv("NOTION_API_KEY", raising=False)
    monkeypatch.delenv("NOTION_TASK_DATABASE_ID", raising=False)
    init_db()
    client = TestClient(app)

    response = client.post("/api/sync/notion")
    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is False
    assert payload["imported"] == 0
