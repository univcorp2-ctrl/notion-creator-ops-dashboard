from __future__ import annotations

from pathlib import Path

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .db import create_property_post, create_social_post, create_task, dashboard_summary, init_db, list_property_posts, list_social_posts, list_tasks, update_task, upsert_notion_task
from .models import DashboardSummary, NotionSyncResult, PropertyPost, PropertyPostCreate, SocialPost, SocialPostCreate, Task, TaskCreate, TaskPatch
from .notion_client import NotionClient

app = FastAPI(title="Notion Creator Ops Dashboard", version="0.1.0", description="Unified kanban and analytics dashboard for Notion tasks, SNS operations, and Facebook real-estate posting workflows.")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "notion-creator-ops-dashboard"}


@app.get("/api/dashboard-summary", response_model=DashboardSummary)
def get_dashboard_summary() -> dict:
    init_db()
    return dashboard_summary()


@app.get("/api/tasks", response_model=list[Task])
def get_tasks() -> list[dict]:
    init_db()
    return list_tasks()


@app.post("/api/tasks", response_model=Task, status_code=201)
def post_task(payload: TaskCreate) -> dict:
    init_db()
    return create_task(payload)


@app.patch("/api/tasks/{task_id}", response_model=Task)
def patch_task(task_id: str, payload: TaskPatch) -> dict:
    init_db()
    task = update_task(task_id, payload.model_dump(exclude_unset=True))
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@app.post("/api/sync/notion", response_model=NotionSyncResult)
async def sync_notion() -> dict:
    init_db()
    client = NotionClient()
    if not client.configured:
        return {"ok": False, "imported": 0, "updated": 0, "skipped": 0, "message": "Notion secrets are not configured. Set NOTION_API_KEY and NOTION_TASK_DATABASE_ID to enable live sync."}
    imported = 0
    updated = 0
    skipped = 0
    try:
        for task in await client.fetch_tasks():
            try:
                result = upsert_notion_task(task)
                imported += int(result == "imported")
                updated += int(result == "updated")
            except Exception:
                skipped += 1
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Notion API request failed: {exc}") from exc
    return {"ok": True, "imported": imported, "updated": updated, "skipped": skipped, "message": f"Synced {imported + updated} Notion tasks."}


@app.get("/api/social-posts", response_model=list[SocialPost])
def get_social_posts() -> list[dict]:
    init_db()
    return list_social_posts()


@app.post("/api/social-posts", response_model=SocialPost, status_code=201)
def post_social_post(payload: SocialPostCreate) -> dict:
    init_db()
    return create_social_post(payload)


@app.get("/api/property-posts", response_model=list[PropertyPost])
def get_property_posts() -> list[dict]:
    init_db()
    return list_property_posts()


@app.post("/api/property-posts", response_model=PropertyPost, status_code=201)
def post_property_post(payload: PropertyPostCreate) -> dict:
    init_db()
    return create_property_post(payload)


frontend_dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
