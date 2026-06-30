from __future__ import annotations

import os
import sqlite3
import uuid
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

from .models import PropertyPostCreate, SocialPostCreate, TaskCreate


def db_path() -> Path:
    return Path(os.getenv("APP_DATABASE_PATH", "data/dashboard.sqlite3"))


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def connect() -> sqlite3.Connection:
    path = db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    with connect() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                project TEXT NOT NULL DEFAULT 'Inbox',
                status TEXT NOT NULL DEFAULT 'todo',
                priority TEXT NOT NULL DEFAULT 'medium',
                due_date TEXT,
                channel TEXT NOT NULL DEFAULT 'Operations',
                progress INTEGER NOT NULL DEFAULT 0,
                source TEXT NOT NULL DEFAULT 'manual',
                external_url TEXT,
                notion_page_id TEXT UNIQUE,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS social_posts (
                id TEXT PRIMARY KEY,
                platform TEXT NOT NULL,
                title TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'draft',
                scheduled_at TEXT,
                published_at TEXT,
                impressions INTEGER NOT NULL DEFAULT 0,
                likes INTEGER NOT NULL DEFAULT 0,
                comments INTEGER NOT NULL DEFAULT 0,
                shares INTEGER NOT NULL DEFAULT 0,
                clicks INTEGER NOT NULL DEFAULT 0,
                source_url TEXT
            );

            CREATE TABLE IF NOT EXISTS property_posts (
                id TEXT PRIMARY KEY,
                property_name TEXT NOT NULL,
                platform TEXT NOT NULL DEFAULT 'Facebook',
                status TEXT NOT NULL DEFAULT 'draft',
                assignee TEXT NOT NULL DEFAULT 'Yuki',
                due_date TEXT,
                address TEXT,
                memo TEXT
            );
            """
        )
        _seed_if_empty(connection)


def _seed_if_empty(connection: sqlite3.Connection) -> None:
    task_count = connection.execute("SELECT COUNT(*) AS count FROM tasks").fetchone()["count"]
    if task_count == 0:
        seed_tasks = [
            TaskCreate(title="X投稿：新サービスの進捗を共有", project="SNS運用", status="doing", priority="high", due_date="2026-07-02", channel="SNS", progress=66, source="demo"),
            TaskCreate(title="Threads投稿：日次作業ログの型を作る", project="SNS運用", status="todo", priority="medium", due_date="2026-07-03", channel="SNS", progress=20, source="demo"),
            TaskCreate(title="不動産物件AのFacebook投稿文を作成", project="不動産投稿", status="review", priority="urgent", due_date="2026-07-01", channel="Real Estate", progress=82, source="demo"),
            TaskCreate(title="ブログ記事：個人開発の進捗管理術", project="ブログ運営", status="doing", priority="high", due_date="2026-07-08", channel="Blog", progress=54, source="demo"),
            TaskCreate(title="LPのヒーローセクションを改善", project="LP改善", status="blocked", priority="medium", due_date="2026-07-09", channel="Landing Page", progress=38, source="demo"),
            TaskCreate(title="Notion連携のプロパティ名を確定", project="統合ダッシュボード", status="done", priority="high", due_date="2026-06-29", channel="Development", progress=100, source="demo"),
        ]
        for task in seed_tasks:
            insert_task(connection, task)

    post_count = connection.execute("SELECT COUNT(*) AS count FROM social_posts").fetchone()["count"]
    if post_count == 0:
        seed_posts = [
            SocialPostCreate(platform="X", title="新しいダッシュボード構想を公開", status="published", published_at="2026-06-25", impressions=8200, likes=512, comments=42, shares=114, clicks=268),
            SocialPostCreate(platform="Threads", title="今日の作業ログ：LP改善と投稿計画", status="published", published_at="2026-06-26", impressions=4100, likes=284, comments=24, shares=39, clicks=122),
            SocialPostCreate(platform="Blog", title="SNSとブログを一体で運用する設計メモ", status="published", published_at="2026-06-28", impressions=3100, likes=118, comments=15, shares=32, clicks=690),
            SocialPostCreate(platform="Facebook", title="駅近リノベーション物件の紹介", status="scheduled", scheduled_at="2026-07-01T10:00:00", impressions=0, likes=0, comments=0, shares=0, clicks=0),
        ]
        for post in seed_posts:
            insert_social_post(connection, post)

    property_count = connection.execute("SELECT COUNT(*) AS count FROM property_posts").fetchone()["count"]
    if property_count == 0:
        seed_property_posts = [
            PropertyPostCreate(property_name="東新宿リノベーション物件", status="scheduled", due_date="2026-07-01", address="東京都新宿区", memo="写真3枚、駅徒歩情報、周辺施設を必ず入れる"),
            PropertyPostCreate(property_name="横浜ファミリー向けマンション", status="draft", due_date="2026-07-04", address="神奈川県横浜市", memo="学区と収納の訴求を強める"),
            PropertyPostCreate(property_name="湾岸タワーマンション", status="analyzing", due_date="2026-07-06", address="東京都江東区", memo="過去投稿の反応を確認してCTAを調整"),
        ]
        for property_post in seed_property_posts:
            insert_property_post(connection, property_post)


def row_to_dict(row: sqlite3.Row) -> dict[str, Any]:
    return dict(row)


def list_tasks() -> list[dict[str, Any]]:
    with connect() as connection:
        rows = connection.execute(
            "SELECT * FROM tasks ORDER BY CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, COALESCE(due_date, '9999-12-31')"
        ).fetchall()
    return [row_to_dict(row) for row in rows]


def insert_task(connection: sqlite3.Connection, task: TaskCreate) -> dict[str, Any]:
    task_id = str(uuid.uuid4())
    connection.execute(
        """
        INSERT INTO tasks (id, title, project, status, priority, due_date, channel, progress, source, external_url, notion_page_id, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            task_id,
            task.title,
            task.project,
            task.status,
            task.priority,
            task.due_date,
            task.channel,
            task.progress,
            task.source,
            task.external_url,
            task.notion_page_id,
            now_iso(),
        ),
    )
    return get_task_by_id(connection, task_id)


def create_task(task: TaskCreate) -> dict[str, Any]:
    with connect() as connection:
        return insert_task(connection, task)


def get_task_by_id(connection: sqlite3.Connection, task_id: str) -> dict[str, Any]:
    row = connection.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    if row is None:
        raise KeyError(task_id)
    return row_to_dict(row)


def update_task(task_id: str, values: dict[str, Any]) -> dict[str, Any] | None:
    allowed = {"title", "project", "status", "priority", "due_date", "channel", "progress", "external_url"}
    fields = {key: value for key, value in values.items() if key in allowed and value is not None}
    fields["updated_at"] = now_iso()
    assignments = ", ".join(f"{field} = ?" for field in fields)
    params = list(fields.values()) + [task_id]

    with connect() as connection:
        connection.execute(f"UPDATE tasks SET {assignments} WHERE id = ?", params)
        row = connection.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    return row_to_dict(row) if row else None


def upsert_notion_task(task: TaskCreate) -> str:
    if not task.notion_page_id:
        raise ValueError("notion_page_id is required for Notion upsert")

    with connect() as connection:
        existing = connection.execute("SELECT id FROM tasks WHERE notion_page_id = ?", (task.notion_page_id,)).fetchone()
        if existing:
            connection.execute(
                """
                UPDATE tasks
                SET title = ?, project = ?, status = ?, priority = ?, due_date = ?, channel = ?, progress = ?, source = 'notion', external_url = ?, updated_at = ?
                WHERE notion_page_id = ?
                """,
                (
                    task.title,
                    task.project,
                    task.status,
                    task.priority,
                    task.due_date,
                    task.channel,
                    task.progress,
                    task.external_url,
                    now_iso(),
                    task.notion_page_id,
                ),
            )
            return "updated"

        insert_task(connection, task)
        return "imported"


def list_social_posts() -> list[dict[str, Any]]:
    with connect() as connection:
        rows = connection.execute("SELECT * FROM social_posts ORDER BY COALESCE(published_at, scheduled_at, '') DESC").fetchall()
    return [row_to_dict(row) for row in rows]


def insert_social_post(connection: sqlite3.Connection, post: SocialPostCreate) -> dict[str, Any]:
    post_id = str(uuid.uuid4())
    connection.execute(
        """
        INSERT INTO social_posts (id, platform, title, status, scheduled_at, published_at, impressions, likes, comments, shares, clicks, source_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (post_id, post.platform, post.title, post.status, post.scheduled_at, post.published_at, post.impressions, post.likes, post.comments, post.shares, post.clicks, post.source_url),
    )
    return row_to_dict(connection.execute("SELECT * FROM social_posts WHERE id = ?", (post_id,)).fetchone())


def create_social_post(post: SocialPostCreate) -> dict[str, Any]:
    with connect() as connection:
        return insert_social_post(connection, post)


def list_property_posts() -> list[dict[str, Any]]:
    with connect() as connection:
        rows = connection.execute("SELECT * FROM property_posts ORDER BY COALESCE(due_date, '9999-12-31')").fetchall()
    return [row_to_dict(row) for row in rows]


def insert_property_post(connection: sqlite3.Connection, post: PropertyPostCreate) -> dict[str, Any]:
    post_id = str(uuid.uuid4())
    connection.execute(
        """
        INSERT INTO property_posts (id, property_name, platform, status, assignee, due_date, address, memo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (post_id, post.property_name, post.platform, post.status, post.assignee, post.due_date, post.address, post.memo),
    )
    return row_to_dict(connection.execute("SELECT * FROM property_posts WHERE id = ?", (post_id,)).fetchone())


def create_property_post(post: PropertyPostCreate) -> dict[str, Any]:
    with connect() as connection:
        return insert_property_post(connection, post)


def dashboard_summary() -> dict[str, Any]:
    today = date.today().isoformat()
    with connect() as connection:
        tasks = connection.execute("SELECT status, progress, due_date FROM tasks").fetchall()
        posts = connection.execute("SELECT impressions, likes, comments, shares, clicks FROM social_posts").fetchall()
        property_posts = connection.execute("SELECT status FROM property_posts").fetchall()

    total_tasks = len(tasks)
    doing_tasks = sum(1 for task in tasks if task["status"] == "doing")
    done_tasks = sum(1 for task in tasks if task["status"] == "done")
    overdue_tasks = sum(1 for task in tasks if task["due_date"] and task["due_date"] < today and task["status"] != "done")
    average_progress = round(sum(task["progress"] for task in tasks) / total_tasks, 1) if total_tasks else 0
    total_impressions = sum(post["impressions"] for post in posts)
    total_engagements = sum(post["likes"] + post["comments"] + post["shares"] + post["clicks"] for post in posts)
    engagement_rate = round((total_engagements / total_impressions) * 100, 2) if total_impressions else 0
    property_posts_pending = sum(1 for post in property_posts if post["status"] != "published")

    return {
        "total_tasks": total_tasks,
        "doing_tasks": doing_tasks,
        "overdue_tasks": overdue_tasks,
        "done_tasks": done_tasks,
        "average_progress": average_progress,
        "social_posts": len(posts),
        "total_impressions": total_impressions,
        "total_engagements": total_engagements,
        "engagement_rate": engagement_rate,
        "property_posts_pending": property_posts_pending,
    }
