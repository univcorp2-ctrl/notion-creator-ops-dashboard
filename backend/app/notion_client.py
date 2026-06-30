from __future__ import annotations

import os
from typing import Any

import httpx

from .models import TaskCreate

NOTION_API_BASE = "https://api.notion.com/v1"


def _property_name(env_name: str, default: str) -> str:
    return os.getenv(env_name, default)


def _plain_text(blocks: list[dict[str, Any]] | None) -> str:
    if not blocks:
        return ""
    return "".join(block.get("plain_text", "") for block in blocks).strip()


def _read_title(properties: dict[str, Any], name: str) -> str:
    value = properties.get(name)
    if value and value.get("type") == "title":
        return _plain_text(value.get("title")) or "Untitled"
    for prop in properties.values():
        if prop.get("type") == "title":
            return _plain_text(prop.get("title")) or "Untitled"
    return "Untitled"


def _read_select_like(properties: dict[str, Any], name: str, fallback: str = "") -> str:
    value = properties.get(name)
    if not value:
        return fallback
    prop_type = value.get("type")
    if prop_type in {"select", "status"}:
        selected = value.get(prop_type)
        return selected.get("name", fallback) if selected else fallback
    if prop_type == "multi_select":
        selected = value.get("multi_select") or []
        return selected[0].get("name", fallback) if selected else fallback
    if prop_type == "rich_text":
        return _plain_text(value.get("rich_text")) or fallback
    return fallback


def _read_date(properties: dict[str, Any], name: str) -> str | None:
    value = properties.get(name)
    if value and value.get("type") == "date" and value.get("date"):
        return value["date"].get("start")
    return None


def _read_number(properties: dict[str, Any], name: str, default: int = 0) -> int:
    value = properties.get(name)
    if value and value.get("type") == "number" and value.get("number") is not None:
        return max(0, min(100, int(value["number"])))
    return default


def normalize_status(value: str) -> str:
    normalized = value.strip().lower()
    if normalized in {"done", "complete", "completed", "完了", "済", "公開済み", "published"}:
        return "done"
    if normalized in {"doing", "in progress", "progress", "進行中", "作業中", "制作中"}:
        return "doing"
    if normalized in {"review", "確認", "レビュー", "承認待ち", "要確認"}:
        return "review"
    if normalized in {"blocked", "stuck", "保留", "停止", "blocked / waiting"}:
        return "blocked"
    return "todo"


def normalize_priority(value: str) -> str:
    normalized = value.strip().lower()
    if normalized in {"urgent", "最高", "緊急", "最優先"}:
        return "urgent"
    if normalized in {"high", "高", "重要"}:
        return "high"
    if normalized in {"low", "低", "あとで"}:
        return "low"
    return "medium"


def normalize_channel(value: str) -> str:
    mapping = {"sns": "SNS", "x": "SNS", "threads": "SNS", "blog": "Blog", "ブログ": "Blog", "lp": "Landing Page", "landing page": "Landing Page", "開発": "Development", "development": "Development", "不動産": "Real Estate", "real estate": "Real Estate", "research": "Research", "調査": "Research"}
    return mapping.get(value.strip().lower(), "Operations")


class NotionClient:
    def __init__(self) -> None:
        self.api_key = os.getenv("NOTION_API_KEY")
        self.database_id = os.getenv("NOTION_TASK_DATABASE_ID") or os.getenv("NOTION_TASK_DATA_SOURCE_ID")
        self.version = os.getenv("NOTION_VERSION", "2022-06-28")

    @property
    def configured(self) -> bool:
        return bool(self.api_key and self.database_id)

    def _headers(self) -> dict[str, str]:
        if not self.api_key:
            raise RuntimeError("NOTION_API_KEY is not configured")
        return {"Authorization": f"Bearer {self.api_key}", "Notion-Version": self.version, "Content-Type": "application/json"}

    async def fetch_tasks(self) -> list[TaskCreate]:
        if not self.database_id:
            raise RuntimeError("NOTION_TASK_DATABASE_ID is not configured")
        payload = {"page_size": 100, "sorts": [{"property": _property_name("NOTION_PROP_DUE_DATE", "Due Date"), "direction": "ascending"}]}
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(f"{NOTION_API_BASE}/data_sources/{self.database_id}/query", headers=self._headers(), json=payload)
            if response.status_code == 404:
                response = await client.post(f"{NOTION_API_BASE}/databases/{self.database_id}/query", headers=self._headers(), json=payload)
            response.raise_for_status()
            data = response.json()
        return [self._page_to_task(page) for page in data.get("results", [])]

    def _page_to_task(self, page: dict[str, Any]) -> TaskCreate:
        properties = page.get("properties", {})
        return TaskCreate(
            title=_read_title(properties, _property_name("NOTION_PROP_TITLE", "Name")),
            project=_read_select_like(properties, _property_name("NOTION_PROP_PROJECT", "Project"), "Inbox") or "Inbox",
            status=normalize_status(_read_select_like(properties, _property_name("NOTION_PROP_STATUS", "Status"), "todo")),  # type: ignore[arg-type]
            priority=normalize_priority(_read_select_like(properties, _property_name("NOTION_PROP_PRIORITY", "Priority"), "medium")),  # type: ignore[arg-type]
            due_date=_read_date(properties, _property_name("NOTION_PROP_DUE_DATE", "Due Date")),
            channel=normalize_channel(_read_select_like(properties, _property_name("NOTION_PROP_CHANNEL", "Channel"), "Operations")),  # type: ignore[arg-type]
            progress=_read_number(properties, _property_name("NOTION_PROP_PROGRESS", "Progress"), 0),
            source="notion",
            external_url=page.get("url"),
            notion_page_id=page.get("id"),
        )
