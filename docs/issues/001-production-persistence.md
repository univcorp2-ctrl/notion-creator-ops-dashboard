# Issue: Production manual task persistence

## Status

Open as project-tracking note. GitHub Issue creation is not available through the current automation tool, so this file records the issue in-repo.

## Summary

Cloudflare Pages Functions are stateless unless a storage binding is added. The production API currently returns a successful response for `POST /api/tasks` so the UI does not break, but the newly added manual task is not persisted after reload.

## Impact

- Notion-backed tasks are visible in production.
- Demo tasks are visible when Notion secrets are not configured.
- Manual task creation in the production UI is non-persistent until D1/KV/Notion write-back is added.

## Recommended fix

Choose one:

1. Add Notion write-back so new tasks are created as Notion pages.
2. Add Cloudflare D1 for first-party persistence.
3. Add Cloudflare KV for lightweight append-only task storage.

## Acceptance criteria

- `POST /api/tasks` persists task data.
- Reloading `/api/tasks` shows the created task.
- CI includes an API-level test for create/list behavior.
