from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

TaskStatus = Literal["todo", "doing", "review", "done", "blocked"]
Priority = Literal["low", "medium", "high", "urgent"]
Channel = Literal["SNS", "Blog", "Landing Page", "Development", "Real Estate", "Research", "Operations"]
Source = Literal["demo", "manual", "notion"]
SocialPlatform = Literal["X", "Threads", "Blog", "Facebook"]
SocialStatus = Literal["draft", "scheduled", "published", "analyzing"]


class Task(BaseModel):
    id: str
    title: str
    project: str = "Inbox"
    status: TaskStatus = "todo"
    priority: Priority = "medium"
    due_date: str | None = None
    channel: Channel = "Operations"
    progress: int = Field(default=0, ge=0, le=100)
    source: Source = "manual"
    external_url: str | None = None
    notion_page_id: str | None = None
    updated_at: str


class TaskCreate(BaseModel):
    title: str = Field(min_length=1)
    project: str = "Inbox"
    status: TaskStatus = "todo"
    priority: Priority = "medium"
    due_date: str | None = None
    channel: Channel = "Operations"
    progress: int = Field(default=0, ge=0, le=100)
    source: Source = "manual"
    external_url: str | None = None
    notion_page_id: str | None = None


class TaskPatch(BaseModel):
    title: str | None = None
    project: str | None = None
    status: TaskStatus | None = None
    priority: Priority | None = None
    due_date: str | None = None
    channel: Channel | None = None
    progress: int | None = Field(default=None, ge=0, le=100)
    external_url: str | None = None


class SocialPost(BaseModel):
    id: str
    platform: SocialPlatform
    title: str
    status: SocialStatus = "draft"
    scheduled_at: str | None = None
    published_at: str | None = None
    impressions: int = 0
    likes: int = 0
    comments: int = 0
    shares: int = 0
    clicks: int = 0
    source_url: str | None = None


class SocialPostCreate(BaseModel):
    platform: SocialPlatform
    title: str = Field(min_length=1)
    status: SocialStatus = "draft"
    scheduled_at: str | None = None
    published_at: str | None = None
    impressions: int = 0
    likes: int = 0
    comments: int = 0
    shares: int = 0
    clicks: int = 0
    source_url: str | None = None


class PropertyPost(BaseModel):
    id: str
    property_name: str
    platform: SocialPlatform = "Facebook"
    status: SocialStatus = "draft"
    assignee: str = "Yuki"
    due_date: str | None = None
    address: str | None = None
    memo: str | None = None


class PropertyPostCreate(BaseModel):
    property_name: str = Field(min_length=1)
    platform: SocialPlatform = "Facebook"
    status: SocialStatus = "draft"
    assignee: str = "Yuki"
    due_date: str | None = None
    address: str | None = None
    memo: str | None = None


class DashboardSummary(BaseModel):
    total_tasks: int
    doing_tasks: int
    overdue_tasks: int
    done_tasks: int
    average_progress: float
    social_posts: int
    total_impressions: int
    total_engagements: int
    engagement_rate: float
    property_posts_pending: int


class NotionSyncResult(BaseModel):
    ok: bool
    imported: int
    updated: int
    skipped: int
    message: str
