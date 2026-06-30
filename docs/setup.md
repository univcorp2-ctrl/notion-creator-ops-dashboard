# Setup Guide

## 1. すぐ試す

Secrets不要でサンプルデータが自動投入されます。

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn app.main:app --app-dir backend --reload --port 8000
```

別ターミナルで:

```bash
npm install --prefix frontend
npm run dev --prefix frontend
```

`http://localhost:5173` を開きます。

## 2. Notion Integrationを作る

1. NotionのMy integrationsで新しいInternal Integrationを作成します。
2. Integration Secretを控えます。
3. タスクDBを開き、Integrationを接続します。
4. タスクDBまたはデータソースIDを控えます。

## 3. 環境変数を設定する

```bash
export NOTION_API_KEY="secret_xxx"
export NOTION_TASK_DATABASE_ID="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
export NOTION_PROP_TITLE="Name"
export NOTION_PROP_STATUS="Status"
export NOTION_PROP_PRIORITY="Priority"
export NOTION_PROP_DUE_DATE="Due Date"
export NOTION_PROP_PROJECT="Project"
export NOTION_PROP_CHANNEL="Channel"
export NOTION_PROP_PROGRESS="Progress"
```

日本語プロパティ名で管理している場合は、例えば以下のように変更します。

```bash
export NOTION_PROP_TITLE="タスク名"
export NOTION_PROP_STATUS="ステータス"
export NOTION_PROP_PRIORITY="優先度"
export NOTION_PROP_DUE_DATE="期限"
export NOTION_PROP_PROJECT="案件"
export NOTION_PROP_CHANNEL="カテゴリ"
export NOTION_PROP_PROGRESS="進捗"
```

## 4. 同期する

Web画面の「Notionから同期」を押すか、APIを直接呼びます。

```bash
curl -X POST http://localhost:8000/api/sync/notion
```

## 5. 本番デプロイの考え方

### 最小構成

- FastAPIをRender、Fly.io、Railway、Cloud Run等で起動
- ReactをbuildしてFastAPIから静的配信、またはVercel/Netlifyへ分離デプロイ
- SQLiteを永続ボリュームに保存
- Notion Secretsをサーバー側環境変数に保存

### 推奨構成

- Backend: FastAPI + PostgreSQL
- Frontend: Vercel / Netlify / Cloudflare Pages
- DB: Supabase / Neon / Cloud SQL
- Secrets: 各ホスティングのSecret Manager
- Scheduled Sync: GitHub ActionsまたはCloud Schedulerで `/api/sync/notion` を定期実行

## 6. よくある詰まり

### Notion同期が0件のまま

- Integrationを対象DBに接続しているか確認します。
- `NOTION_TASK_DATABASE_ID` が正しいか確認します。
- プロパティ名が環境変数と一致しているか確認します。

### 画面からAPIにつながらない

- backendが `http://127.0.0.1:8000` で動いているか確認します。
- frontendはVite proxyで `/api` をbackendへ転送します。

### 本番でデータが消える

- SQLiteファイルを永続ディスクに置きます。
- あるいはPostgreSQLへ移行します。
