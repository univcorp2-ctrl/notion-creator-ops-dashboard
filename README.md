# Notion Creator Ops Dashboard

> Repository visibility: **Private**

Notion上のタスク、SNS運用、ブログ/LP/開発、不動産物件のFacebook投稿を一元管理するフルスタック統合ダッシュボードです。

GPT Imageで生成したダークモードSaaS風の参照デザインをベースに、カード型KPI、かんばん、SNS反応トレンド、Facebook不動産投稿の確認パネルを1画面に集約しています。初回起動時はサンプルデータで動き、NotionのSecretsを設定すると既存タスクDBから同期できます。

## 画面イメージ

![Dashboard preview](docs/dashboard-preview.svg)

## 本番URL

Cloudflare Pages / Functionsで本番URLを発行する構成を追加済みです。

- App: `https://notion-creator-ops-dashboard.pages.dev`
- API Health: `https://notion-creator-ops-dashboard.pages.dev/api/health`
- Tasks API: `https://notion-creator-ops-dashboard.pages.dev/api/tasks`

CloudflareのAPI TokenとAccount IDをGitHub Actions Secretsに入れると、`.github/workflows/deploy-cloudflare.yml` がCloudflare Pagesへdeployします。詳細は `docs/production-url.md` を参照してください。

## できること

- NotionタスクDB / データソースからタスクを同期
- 期限、優先順位、案件、カテゴリ、進捗率をかんばん方式で可視化
- SNS運用状況を X / Threads / Blog / Facebook 横断で確認
- 不動産物件のFacebook投稿予定、下書き、分析中ステータスを管理
- SQLiteにローカル保存し、FastAPI経由でReact画面へ表示
- Cloudflare Pages Functionsで `/api/*` を提供できる本番構成
- CIでバックエンドテスト、フロントエンド型チェック、テスト、ビルドを自動実行

## アーキテクチャ

```mermaid
flowchart LR
    U[User] --> UI[React / Vite Dashboard]
    UI --> API[FastAPI Backend local]
    UI --> CF[Cloudflare Pages Functions production]
    API --> DB[(SQLite)]
    API --> N[Notion API]
    CF --> N
    CF --> Demo[Demo Data Fallback]
    GHA[GitHub Actions CI/CD] --> PY[Backend Tests]
    GHA --> FE[Frontend Typecheck / Tests / Build]
    GHA --> CFP[Cloudflare Pages Deploy]
```

### 処理の流れ

1. Reactダッシュボードが `/api/dashboard-summary`、`/api/tasks`、`/api/social-posts`、`/api/property-posts` を呼び出します。
2. ローカルではFastAPIがSQLiteから現在のタスク、SNS投稿、物件投稿を読み込みます。
3. 本番CloudflareではPages Functionsが `/api/*` を受け、デモデータまたはNotion APIの結果を返します。
4. 「Notionから同期」を押すと `/api/sync/notion` がNotion APIへ接続します。
5. フロントエンドは更新後の状態を再取得し、かんばんとKPIを再描画します。

## ローカル起動

```bash
# backend
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn app.main:app --app-dir backend --reload --port 8000

# frontend: 別ターミナル
npm install --prefix frontend
npm run dev --prefix frontend
```

ブラウザで `http://localhost:5173` を開きます。

## Notion連携に必要なSecrets

Secretsを設定しなくてもサンプルデータで画面は動きます。本番でNotionタスクを同期する場合は以下を設定します。

| 環境変数 | 必須 | 内容 |
| --- | --- | --- |
| `NOTION_API_KEY` | 本番必須 | Notion Integration Secret |
| `NOTION_TASK_DATABASE_ID` | 本番必須 | タスクDBまたはデータソースID |
| `NOTION_VERSION` | 任意 | 既定値 `2022-06-28` |
| `NOTION_PROP_TITLE` | 任意 | 既定値 `Name` |
| `NOTION_PROP_STATUS` | 任意 | 既定値 `Status` |
| `NOTION_PROP_PRIORITY` | 任意 | 既定値 `Priority` |
| `NOTION_PROP_DUE_DATE` | 任意 | 既定値 `Due Date` |
| `NOTION_PROP_PROJECT` | 任意 | 既定値 `Project` |
| `NOTION_PROP_CHANNEL` | 任意 | 既定値 `Channel` |
| `NOTION_PROP_PROGRESS` | 任意 | 既定値 `Progress` |
| `APP_DATABASE_PATH` | 任意 | SQLite保存先。既定値 `data/dashboard.sqlite3` |

## Notion側の推奨DBプロパティ

| プロパティ | 型 | 例 |
| --- | --- | --- |
| Name | Title | ブログ記事を書く |
| Status | Status / Select | 未着手、進行中、レビュー、完了、保留 |
| Priority | Select | low、medium、high、urgent |
| Due Date | Date | 2026-07-01 |
| Project | Select / Rich text | SNS運用、LP改善、不動産投稿 |
| Channel | Select | SNS、Blog、Landing Page、Development、Real Estate |
| Progress | Number | 0〜100 |

## 本番運用に必要なもの

- Notion Integrationと対象タスクDBへの接続権限
- `NOTION_API_KEY` と `NOTION_TASK_DATABASE_ID` をCloudflare Pages Environment Variablesへ保存すること
- Cloudflare deployにはGitHub Actions Secrets `CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` が必要
- SQLite版を本番運用する場合は永続ボリューム、またはPostgreSQL等への置き換え
- X / Threads / Facebookの実績値を自動取得する場合は各プラットフォームAPIまたはCSVインポート処理の追加

## ディレクトリ構成

```text
backend/                          FastAPI + SQLite + Notion sync
frontend/                         React + Vite + TypeScript dashboard
frontend/functions/api/[[path]].js Cloudflare Pages Functions API
docs/                             設計、セットアップ、Notionスキーマ、画面プレビュー
.github/workflows/ci.yml          Backend/Frontend CI
.github/workflows/deploy-cloudflare.yml Cloudflare Pages deploy
.devcontainer/                    Codespaces / Dev Container
```

詳細は `docs/architecture.md`、`docs/setup.md`、`docs/production-url.md` を参照してください。
