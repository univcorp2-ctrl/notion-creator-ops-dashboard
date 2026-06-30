# CODEX

## 開発方針

- 主要言語: Python / TypeScript
- Backend: FastAPI + SQLite
- Frontend: React + Vite
- CI: GitHub Actions
- Notion Secretsや外部APIキーは絶対にコミットしない

## 実行コマンド

```bash
pip install -r backend/requirements.txt
pytest backend/tests -q
npm install --prefix frontend
npm run lint --prefix frontend
npm test --prefix frontend
npm run build --prefix frontend
```

## 実装メモ

- `POST /api/sync/notion` はSecrets未設定時に失敗させず、MVP画面を維持する。
- Notion同期は `notion_page_id` でupsertする。
- SNS API連携は未実装。初期MVPではDBに保存された実績値を可視化する。
- 画面デザインは `docs/design.md` のGPT Image参照デザインに合わせる。
